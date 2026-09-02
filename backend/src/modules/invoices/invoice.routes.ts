import { Router } from "express";
import { InvoiceStatus } from "@prisma/client";
import { requireAuth } from "../../middleware/auth";
import * as invoiceService from "./invoice.service";

export const invoiceRouter = Router();

invoiceRouter.use(requireAuth);

invoiceRouter.get("/", async (req, res, next) => {
  try {
    const status = req.query.status as InvoiceStatus | undefined;
    const invoices = await invoiceService.listInvoices(req.user!.id, status);
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

invoiceRouter.post("/", async (req, res, next) => {
  try {
    const invoice = await invoiceService.createInvoice(req.user!.id, req.body);
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

invoiceRouter.get("/:id", async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoice(req.user!.id, req.params.id);
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

invoiceRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const invoice = await invoiceService.updateInvoiceStatus(
      req.user!.id,
      req.params.id,
      req.body,
    );
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

invoiceRouter.put("/:id", async (req, res, next) => {
  try {
    const invoice = await invoiceService.updateInvoice(
      req.user!.id,
      req.params.id,
      req.body,
    );
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

invoiceRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await invoiceService.deleteInvoice(req.user!.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
