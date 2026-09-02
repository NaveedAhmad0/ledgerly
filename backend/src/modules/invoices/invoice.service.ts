import { InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { invoiceTotals, parseEuroToCents, euros } from "../../lib/money";
import { invoiceStatusSchema, upsertInvoiceSchema } from "./invoice.schema";

function serializeInvoice(
  invoice: Prisma.InvoiceGetPayload<{ include: { items: true } }>,
) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    status: invoice.status,
    notes: invoice.notes ?? "",
    paymentTerms: invoice.paymentTerms,
    currency: invoice.currency,
    billFrom: {
      businessName: invoice.fromName,
      email: invoice.fromEmail,
      address: invoice.fromAddress ?? "",
      phone: invoice.fromPhone ?? "",
    },
    billTo: {
      clientName: invoice.clientName,
      email: invoice.clientEmail ?? "",
      address: invoice.clientAddress ?? "",
      phone: invoice.clientPhone ?? "",
    },
    items: invoice.items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: euros(item.unitPriceCents),
        taxPercent: Number(item.taxPercent),
        lineTotal: euros(item.lineTotalCents),
      })),
    subtotal: euros(invoice.subtotalCents),
    taxTotal: euros(invoice.taxTotalCents),
    total: euros(invoice.totalCents),
    subtotalCents: invoice.subtotalCents,
    taxTotalCents: invoice.taxTotalCents,
    totalCents: invoice.totalCents,
    createdAt: invoice.createdAt.toISOString(),
  };
}

async function nextInvoiceNumber(userId: string, tx: Prisma.TransactionClient) {
  const last = await tx.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  const year = new Date().getFullYear();
  const match = last?.invoiceNumber.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `INV-${year}-${String(next).padStart(3, "0")}`;
}

function toCreateData(
  userId: string,
  invoiceNumber: string,
  data: ReturnType<typeof upsertInvoiceSchema.parse>,
) {
  const lines = data.items.map((item) => ({
    quantity: item.quantity,
    unitPriceCents: parseEuroToCents(item.unitPrice),
    taxPercent: item.taxPercent,
    description: item.description,
  }));
  const totals = invoiceTotals(lines);

  return {
    userId,
    invoiceNumber,
    invoiceDate: new Date(data.invoiceDate),
    dueDate: new Date(data.dueDate),
    status: (data.status as InvoiceStatus | undefined) ?? InvoiceStatus.UNPAID,
    notes: data.notes,
    paymentTerms: data.paymentTerms ?? "Net 15",
    fromName: data.billFrom.businessName,
    fromEmail: data.billFrom.email,
    fromAddress: data.billFrom.address,
    fromPhone: data.billFrom.phone,
    clientName: data.billTo.clientName,
    clientEmail: data.billTo.email || null,
    clientAddress: data.billTo.address,
    clientPhone: data.billTo.phone,
    ...totals,
    items: {
      create: lines.map((line, index) => ({
        description: line.description,
        quantity: new Prisma.Decimal(line.quantity),
        unitPriceCents: line.unitPriceCents,
        taxPercent: new Prisma.Decimal(line.taxPercent),
        lineTotalCents: invoiceTotals([line]).totalCents,
        sortOrder: index,
      })),
    },
  };
}

export async function createInvoice(userId: string, input: unknown) {
  const data = upsertInvoiceSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = data.invoiceNumber ?? (await nextInvoiceNumber(userId, tx));
    const invoice = await tx.invoice.create({
      data: toCreateData(userId, invoiceNumber, data),
      include: { items: true },
    });
    return serializeInvoice(invoice);
  });
}

export async function listInvoices(userId: string, status?: InvoiceStatus) {
  const invoices = await prisma.invoice.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: { items: true },
    orderBy: { invoiceDate: "desc" },
  });
  return invoices.map(serializeInvoice);
}

export async function getInvoice(userId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { items: true },
  });
  if (!invoice) throw new AppError(404, "Invoice not found");
  return serializeInvoice(invoice);
}

export async function updateInvoice(userId: string, id: string, input: unknown) {
  const existing = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "Invoice not found");

  const data = upsertInvoiceSchema.parse(input);
  const payload = toCreateData(
    userId,
    data.invoiceNumber ?? existing.invoiceNumber,
    data,
  );
  const { items, userId: _userId, ...fields } = payload;

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: { ...fields, items },
      include: { items: true },
    });
  });

  return serializeInvoice(invoice);
}

export async function updateInvoiceStatus(userId: string, id: string, input: unknown) {
  const existing = await prisma.invoice.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new AppError(404, "Invoice not found");

  const { status } = invoiceStatusSchema.parse(input);
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status },
    include: { items: true },
  });
  return serializeInvoice(invoice);
}

export async function deleteInvoice(userId: string, id: string) {
  const existing = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "Invoice not found");
  await prisma.invoice.delete({ where: { id } });
  return { message: "Invoice deleted" };
}

export async function dashboardStats(userId: string) {
  const rows = await prisma.$queryRaw<
    Array<{ status: InvoiceStatus; count: bigint; total: bigint }>
  >`
    SELECT status, COUNT(*)::bigint AS count, COALESCE(SUM("totalCents"), 0)::bigint AS total
    FROM invoices
    WHERE "userId" = ${userId}::uuid
    GROUP BY status
  `;

  const paid = rows.find((row) => row.status === "PAID");
  const unpaid = rows.find((row) => row.status === "UNPAID");
  const invoiceCount = rows.reduce((sum, row) => sum + Number(row.count), 0);

  const recent = await prisma.invoice.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { invoiceDate: "desc" },
    take: 5,
  });

  return {
    invoiceCount,
    paidTotal: euros(Number(paid?.total ?? 0)),
    unpaidTotal: euros(Number(unpaid?.total ?? 0)),
    paidCount: Number(paid?.count ?? 0),
    unpaidCount: Number(unpaid?.count ?? 0),
    recentInvoices: recent.map(serializeInvoice),
  };
}
