import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as authService from "./auth.service";

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user!.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

authRouter.put("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
});
