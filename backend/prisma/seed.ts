import { PrismaClient, InvoiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@ledgerly.dev";
const LEGACY_DEMO_EMAIL = "demo@finvoice.dev";

async function main() {
  const passwordHash = await bcrypt.hash("DemoPass12$", 10);
  const profile = {
    name: "Demo User",
    email: DEMO_EMAIL,
    passwordHash,
    businessName: "Northwind Studio",
    address: "Koreastraße 7, 20457 Hamburg",
    phone: "+49 40 000000",
  };

  const existing = await prisma.user.findFirst({
    where: { email: { in: [DEMO_EMAIL, LEGACY_DEMO_EMAIL] } },
  });

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: profile })
    : await prisma.user.create({ data: profile });

  await prisma.invoice.deleteMany({ where: { userId: user.id } });

  await prisma.invoice.create({
    data: {
      userId: user.id,
      invoiceNumber: "INV-2026-001",
      invoiceDate: new Date("2026-08-01"),
      dueDate: new Date("2026-08-15"),
      status: InvoiceStatus.PAID,
      fromName: "Northwind Studio",
      fromEmail: DEMO_EMAIL,
      fromAddress: "Koreastraße 7, 20457 Hamburg",
      clientName: "Beacon Media GmbH",
      clientEmail: "ap@beacon.example",
      clientAddress: "Berlin",
      subtotalCents: 240000,
      taxTotalCents: 45600,
      totalCents: 285600,
      items: {
        create: [
          {
            description: "Dashboard implementation",
            quantity: 8,
            unitPriceCents: 30000,
            taxPercent: 19,
            lineTotalCents: 285600,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      userId: user.id,
      invoiceNumber: "INV-2026-002",
      invoiceDate: new Date("2026-08-20"),
      dueDate: new Date("2026-09-03"),
      status: InvoiceStatus.UNPAID,
      fromName: "Northwind Studio",
      fromEmail: DEMO_EMAIL,
      clientName: "Helix Publishing",
      clientEmail: "finance@helix.example",
      subtotalCents: 150000,
      taxTotalCents: 28500,
      totalCents: 178500,
      items: {
        create: [
          {
            description: "API integration",
            quantity: 5,
            unitPriceCents: 30000,
            taxPercent: 19,
            lineTotalCents: 178500,
            sortOrder: 0,
          },
        ],
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
