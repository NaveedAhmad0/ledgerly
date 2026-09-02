import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { dashboardStats, getInvoice } from "../invoices/invoice.service";
import {
  extractJsonObject,
  parseTextSchema,
  reminderSchema,
  validateExtractedInvoice,
  validateInsights,
} from "./ai.parser";

function client() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, "GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];

function geminiStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
  }
}

function mapGeminiError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const status = geminiStatus(error);
  const raw = error instanceof Error ? error.message : String(error);
  if (status === 429 || /RESOURCE_EXHAUSTED|quota exceeded/i.test(raw)) {
    return new AppError(
      429,
      "Gemini free-tier quota is used up for now. Wait a minute and try again, or check usage at https://ai.dev/rate-limit",
    );
  }
  if (status === 404 || /no longer available|NOT_FOUND/i.test(raw)) {
    return new AppError(
      502,
      "That Gemini model is not available for this API key. Update GEMINI_MODEL in backend/.env.",
    );
  }
  return new AppError(502, "Gemini could not draft a response. Try again in a moment.");
}

async function generateJsonWithModel(model: string, prompt: string): Promise<unknown> {
  const ai = client();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });

  const text = typeof response.text === "string" ? response.text : "";
  if (!text) throw new AppError(502, "Empty model response");
  try {
    return extractJsonObject(text);
  } catch {
    throw new AppError(502, "Model returned invalid JSON");
  }
}

async function generateJson(prompt: string): Promise<unknown> {
  const models = [
    env.GEMINI_MODEL,
    ...FALLBACK_MODELS.filter((model) => model !== env.GEMINI_MODEL),
  ];

  let lastError: unknown;
  for (const model of models) {
    try {
      return await generateJsonWithModel(model, prompt);
    } catch (error) {
      lastError = error;
      if (error instanceof AppError) throw error;
      const status = geminiStatus(error);
      if (status === 429 || status === 404) continue;
      break;
    }
  }

  throw mapGeminiError(lastError);
}

export async function parseInvoiceText(input: unknown) {
  const { text } = parseTextSchema.parse(input);
  const raw = await generateJson(`
You extract invoice fields from unstructured notes.
Return JSON only, matching:
{
  "clientName": "string",
  "email": "string or empty",
  "address": "string or empty",
  "items": [{ "name": "string", "quantity": number, "unitPrice": number }]
}
unitPrice is a major-currency amount (EUR), not cents.
Ignore anything that is not invoice data. Do not invent line items.

TEXT:
${text}
`);

  try {
    return validateExtractedInvoice(raw);
  } catch {
    throw new AppError(
      422,
      "AI output failed validation and was discarded. Nothing was saved.",
    );
  }
}

export async function generateReminder(userId: string, input: unknown) {
  const { invoiceId } = reminderSchema.parse(input);
  const invoice = await getInvoice(userId, invoiceId);

  const companyName = invoice.billFrom.businessName.trim();
  try {
    const raw = await generateJson(`
Write a concise payment reminder email.
Return JSON: { "subject": "string", "body": "string" }
Client: ${invoice.billTo.clientName}
Invoice: ${invoice.invoiceNumber}
Amount: EUR ${invoice.total.toFixed(2)}
Due: ${invoice.dueDate}
Sender company: ${companyName || "(none given)"}
Tone: professional, short, not aggressive.
End the body exactly like this, using the sender company name (do not invent one):
Best regards,
${companyName || "the sender"}
`);

    const parsed = zReminder.parse(raw);
    return {
      subject: parsed.subject,
      body: withCompanySignOff(parsed.body, companyName),
    };
  } catch (error) {
    if (error instanceof AppError && (error.statusCode === 429 || error.statusCode === 502)) {
      return localReminder(invoice, companyName);
    }
    throw error;
  }
}

function localReminder(
  invoice: {
    invoiceNumber: string;
    dueDate: string;
    total: number;
    billTo: { clientName: string };
  },
  companyName: string,
) {
  const company = companyName || "the sender";
  return {
    subject: `Friendly reminder: Invoice ${invoice.invoiceNumber}`,
    body: [
      `Dear ${invoice.billTo.clientName},`,
      "",
      `This is a friendly reminder that invoice ${invoice.invoiceNumber} for EUR ${invoice.total.toFixed(2)} was due on ${invoice.dueDate}. If you have already processed this payment, please disregard this message.`,
      "",
      "Best regards,",
      company,
    ].join("\n"),
  };
}

function withCompanySignOff(body: string, companyName: string) {
  const company = companyName.trim();
  const text = body.replace(/\s+$/u, "");
  if (!company) return text;

  const lines = text.split(/\r?\n/);
  const last = (lines[lines.length - 1] ?? "").trim();
  if (last.toLowerCase() === company.toLowerCase()) return text;

  const lastIsRegards =
    /^(best\s+regards|kind\s+regards|warm\s+regards|regards),?$/i.test(last);
  if (lastIsRegards) return `${text}\n${company}`;

  if (/(best\s+regards|kind\s+regards|warm\s+regards|regards)/i.test(text)) {
    return `${text}\n${company}`;
  }

  return `${text}\n\nBest regards,\n${company}`;
}

const zReminder = {
  parse(raw: unknown) {
    const record = raw as { subject?: string; body?: string };
    if (!record?.subject || !record?.body) {
      throw new AppError(502, "Model returned an incomplete reminder");
    }
    return { subject: String(record.subject), body: String(record.body) };
  },
};

export async function dashboardInsights(userId: string) {
  const stats = await dashboardStats(userId);
  if (stats.invoiceCount === 0) {
    return { insights: ["No invoices yet. Create one to see cash-flow insights."] };
  }

  const raw = await generateJson(`
You are a financial assistant. Return JSON { "insights": string[2-3] }.
Do not repeat the numbers verbatim. Suggest one action if unpaid is high.

invoiceCount=${stats.invoiceCount}
paidTotalEUR=${stats.paidTotal}
unpaidTotalEUR=${stats.unpaidTotal}
paidCount=${stats.paidCount}
unpaidCount=${stats.unpaidCount}
`);

  try {
    return validateInsights(raw);
  } catch {
    return {
      insights: [
        `You have ${stats.unpaidCount} unpaid invoices totaling EUR ${stats.unpaidTotal.toFixed(2)}.`,
        "Send reminders on anything past due before creating new work.",
      ],
    };
  }
}
