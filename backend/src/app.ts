import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { invoiceRouter } from "./modules/invoices/invoice.routes";
import { aiRouter } from "./modules/ai/ai.routes";
import { yoga } from "./graphql/yoga";
import { errorHandler } from "./middleware/error";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(","),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/invoices", invoiceRouter);
  app.use("/api/ai", aiRouter);
  app.use(yoga.graphqlEndpoint, yoga);

  app.use(errorHandler);
  return app;
}
