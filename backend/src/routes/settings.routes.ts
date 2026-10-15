import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSettings, updateSettings } from "../controllers/settings.controller.js";
export const settingsRouter = Router();
settingsRouter.use(requireAuth);
settingsRouter.get("/", asyncHandler(getSettings));
settingsRouter.put("/", requireRole("ADMIN"), asyncHandler(updateSettings));
