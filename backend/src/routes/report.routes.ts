import { Router } from "express";
import { getSalesReport } from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reportRouter = Router();
reportRouter.get("/sales", requireAuth, asyncHandler(getSalesReport));
