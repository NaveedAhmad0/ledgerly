import { z } from "zod";

const money = z.coerce.number().min(0).max(1_000_000);

export const invoiceItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.coerce.number().positive().max(10_000),
  unitPrice: money,
  taxPercent: z.coerce.number().min(0).max(100).default(19),
});

export const invoiceStatusSchema = z.object({
  status: z.enum(["UNPAID", "PAID"]),
});

export const upsertInvoiceSchema = z.object({
  invoiceNumber: z.string().min(3).max(40).optional(),
  invoiceDate: z.string().min(8),
  dueDate: z.string().min(8),
  status: z.enum(["UNPAID", "PAID"]).optional(),
  notes: z.string().max(2000).optional(),
  paymentTerms: z.string().max(80).optional(),
  billFrom: z.object({
    businessName: z.string().min(1).max(120),
    email: z.string().email(),
    address: z.string().max(240).optional(),
    phone: z.string().max(40).optional(),
  }),
  billTo: z.object({
    clientName: z.string().min(1).max(120),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().max(240).optional(),
    phone: z.string().max(40).optional(),
  }),
  items: z.array(invoiceItemSchema).min(1),
});

export const extractedInvoiceSchema = z.object({
  clientName: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")).default(""),
  address: z.string().max(240).optional().default(""),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        quantity: z.coerce.number().positive().max(10_000),
        unitPrice: z.coerce.number().min(0).max(1_000_000),
      }),
    )
    .min(1),
});

export type ExtractedInvoice = z.infer<typeof extractedInvoiceSchema>;
