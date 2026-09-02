import { z } from "zod";
import { extractedInvoiceSchema, type ExtractedInvoice } from "../invoices/invoice.schema";

export const parseTextSchema = z.object({
  text: z.string().min(12).max(8000),
});

export const reminderSchema = z.object({
  invoiceId: z.string().uuid(),
});

export function extractJsonObject(raw: string): unknown {
  const stripped = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model response did not contain JSON");
  }
  return JSON.parse(stripped.slice(start, end + 1));
}

export function validateExtractedInvoice(raw: unknown): ExtractedInvoice {
  return extractedInvoiceSchema.parse(raw);
}

const insightSchema = z.object({
  insights: z.array(z.string().min(1)).min(1).max(5),
});

export function validateInsights(raw: unknown): { insights: string[] } {
  return insightSchema.parse(raw);
}
