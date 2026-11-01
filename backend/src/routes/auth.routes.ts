import { Router } from "express";
import { changePassword, login, logout, me, resendVerification, verifyEmail } from "../controllers/auth.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditMutation } from "../middleware/activityAudit.js";

export const authRouter = Router();

authRouter.post("/login", rateLimit(15 * 60_000, 10), asyncHandler(login));
authRouter.post("/verify-email", rateLimit(15 * 60_000, 10), asyncHandler(verifyEmail));
authRouter.post("/resend-verification", rateLimit(60 * 60_000, 3), asyncHandler(resendVerification));
authRouter.post("/logout", requireAuth, auditMutation("LOGOUT", "AUTHENTICATION"), asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.post("/change-password", requireAuth, auditMutation("PASSWORD_CHANGED", "AUTHENTICATION"), asyncHandler(changePassword));
