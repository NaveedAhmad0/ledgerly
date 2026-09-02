import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-16";
process.env.JWT_EXPIRES_IN = "1d";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://ledgerly:ledgerly@localhost:5432/ledgerly";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.GEMINI_API_KEY = "";
