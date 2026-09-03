import { PrismaClient } from "@prisma/client";
import { ensureDemoData } from "../src/lib/seedDemo";

const prisma = new PrismaClient();

async function main() {
  await ensureDemoData(prisma, { resetInvoices: true });
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
