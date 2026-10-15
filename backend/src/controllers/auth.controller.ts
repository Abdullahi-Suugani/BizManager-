import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { loginSchema } from "../validators/auth.validator.js";
import { registerSchema, resendSchema, verifySchema } from "../validators/auth.validator.js";
import { HttpError } from "../utils/httpError.js";
import crypto from "node:crypto";
import { sendVerificationEmail } from "../services/email.service.js";

function publicUser(user: { id: string; name: string; email: string; role: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (!user.emailVerified || user.accountStatus !== "ACTIVE") throw new HttpError(403, "Please verify your email and wait for account approval before logging in");

  const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

  if (!isValidPassword) {
    throw new HttpError(401, "Invalid email or password");
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: "8h"
  });

  res.json({
    token,
    user: publicUser(user)
  });
}

export async function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    if (!existing.emailVerified) {
      throw new HttpError(409, "An account with this email is already pending verification. Use the login page to resend the verification email after the email service is configured.");
    }
    throw new HttpError(409, "An account with this email already exists. Please sign in instead.");
  }
  const user = await prisma.user.create({ data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: "EMPLOYEE", accountStatus: env.EMAIL_VERIFICATION_REQUIRED ? "PENDING" : "ACTIVE", emailVerified: !env.EMAIL_VERIFICATION_REQUIRED } });
  if (!env.EMAIL_VERIFICATION_REQUIRED) {
    res.status(201).json({ message: "Account created. You can now log in." });
    return;
  }
  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"), expiresAt: new Date(Date.now() + env.VERIFICATION_TOKEN_TTL_MINUTES * 60_000) } });
  await sendVerificationEmail(user.email, user.name, rawToken);
  res.status(201).json({ message: "Account created. Check your email to verify your address." });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = verifySchema.parse(req.body);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) throw new HttpError(400, "This verification link is invalid or expired");
  await prisma.$transaction([prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true, accountStatus: "ACTIVE" } })]);
  res.json({ message: "Email verified successfully. You can now log in." });
}

export async function resendVerification(req: Request, res: Response) {
  const { email } = resendSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (env.EMAIL_VERIFICATION_REQUIRED && user && !user.emailVerified) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"), expiresAt: new Date(Date.now() + env.VERIFICATION_TOKEN_TTL_MINUTES * 60_000) } });
    await sendVerificationEmail(user.email, user.name, rawToken);
  }
  res.json({ message: "If an account requires verification, a new email has been sent." });
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}

export async function logout(_req: Request, res: Response) {
  res.json({ message: "Logged out successfully" });
}
