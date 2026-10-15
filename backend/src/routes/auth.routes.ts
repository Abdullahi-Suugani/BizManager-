import { Router } from "express";
import { login, logout, me, register, resendVerification, verifyEmail } from "../controllers/auth.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/login", rateLimit(15 * 60_000, 10), asyncHandler(login));
authRouter.post("/register", rateLimit(60 * 60_000, 5), asyncHandler(register));
authRouter.post("/verify-email", rateLimit(15 * 60_000, 10), asyncHandler(verifyEmail));
authRouter.post("/resend-verification", rateLimit(60 * 60_000, 3), asyncHandler(resendVerification));
authRouter.post("/logout", requireAuth, asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));
