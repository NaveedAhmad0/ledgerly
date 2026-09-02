import {
  extractJsonObject,
  validateExtractedInvoice,
  validateInsights,
} from "../src/modules/ai/ai.parser";

describe("AI output is untrusted", () => {
  it("extracts JSON even when the model wraps it in fences", () => {
    const raw = '```json\n{"clientName":"Acme","items":[{"name":"Design","quantity":2,"unitPrice":150}]}\n```';
    expect(extractJsonObject(raw)).toMatchObject({ clientName: "Acme" });
  });

  it("rejects incomplete extraction before anything can be saved", () => {
    expect(() =>
      validateExtractedInvoice({ clientName: "Acme", items: [] }),
    ).toThrow();
  });

  it("rejects invented insight shapes", () => {
    expect(() => validateInsights({ insight: "ok" })).toThrow();
    expect(validateInsights({ insights: ["Follow up on overdue invoices."] }).insights).toHaveLength(1);
  });
});
