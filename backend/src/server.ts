import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { ensureDemoData } from "./lib/seedDemo";

const app = createApp();

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Ledgerly API listening on :${env.PORT}`);
});

ensureDemoData(prisma)
  .then(() => console.log("Demo user ready"))
  .catch((error) => console.error("Demo seed failed", error));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
