import { Router } from "express";
import { createTransaction, getTransaction, listTransactions, updateTransaction } from "../controllers/transaction.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const transactionRouter = Router();

transactionRouter.post("/", requireAuth, asyncHandler(createTransaction));
transactionRouter.get("/", requireAuth, asyncHandler(listTransactions));
transactionRouter.put("/:id", requireAuth, asyncHandler(updateTransaction));
transactionRouter.get("/:id", requireAuth, asyncHandler(getTransaction));
