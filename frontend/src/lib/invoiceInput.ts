import type { Invoice } from "./types";

export function toInvoiceWriteBody(invoice: Pick<
  Invoice,
  "invoiceNumber" | "invoiceDate" | "dueDate" | "status" | "notes" | "paymentTerms" | "billFrom" | "billTo" | "items"
>) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    billFrom: invoice.billFrom,
    billTo: invoice.billTo,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxPercent: item.taxPercent,
    })),
  };
}
