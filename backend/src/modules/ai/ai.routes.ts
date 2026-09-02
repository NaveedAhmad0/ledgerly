import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth";
import * as aiService from "./ai.service";

export const aiRouter = Router();

const aiLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

aiRouter.use(requireAuth);
if (process.env.NODE_ENV !== "test") {
  aiRouter.use(aiLimit);
}

aiRouter.post("/parse-text", async (req, res, next) => {
  try {
    const parsed = await aiService.parseInvoiceText(req.body);
    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

aiRouter.post("/generate-reminder", async (req, res, next) => {
  try {
    const reminder = await aiService.generateReminder(req.user!.id, req.body);
    res.json(reminder);
  } catch (error) {
    next(error);
  }
});

aiRouter.get("/dashboard-summary", async (req, res, next) => {
  try {
    const summary = await aiService.dashboardInsights(req.user!.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});
