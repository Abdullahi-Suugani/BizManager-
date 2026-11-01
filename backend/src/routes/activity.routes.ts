import { Router } from "express";
import { listActivity } from "../controllers/activity.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const activityRouter = Router();
activityRouter.get("/", requireAuth, requireRole("ADMIN"), asyncHandler(listActivity));
