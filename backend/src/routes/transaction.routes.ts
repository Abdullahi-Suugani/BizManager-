import { Router } from "express";
import { createTransaction, getTransaction, listTransactions, updateTransaction } from "../controllers/transaction.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { auditMutation } from "../middleware/activityAudit.js";
import { requirePermission } from "../security/permissions.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const transactionRouter = Router();

transactionRouter.post("/", requireAuth, auditMutation("INVOICE_CREATED", "INVOICE"), requirePermission("invoices.create"), asyncHandler(createTransaction));
transactionRouter.get("/", requireAuth, requirePermission("invoices.view"), asyncHandler(listTransactions));
transactionRouter.put("/:id", requireAuth, auditMutation("INVOICE_UPDATED", "INVOICE"), requirePermission("invoices.edit"), asyncHandler(updateTransaction));
transactionRouter.get("/:id", requireAuth, requirePermission("invoices.view"), asyncHandler(getTransaction));
