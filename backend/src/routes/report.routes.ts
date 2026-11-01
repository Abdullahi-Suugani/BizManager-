import { Router } from "express";
import { getSalesReport } from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requirePermission } from "../security/permissions.js";

export const reportRouter = Router();
reportRouter.get("/sales", requireAuth, requirePermission("reports.view"), asyncHandler(getSalesReport));
