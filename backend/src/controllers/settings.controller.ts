import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { settingsSchema } from "../validators/settings.validator.js";
export async function getSettings(_req: Request, res: Response) { const settings = await prisma.businessSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }); res.json({ settings }); }
export async function updateSettings(req: Request, res: Response) { const data = settingsSchema.parse(req.body); const settings = await prisma.businessSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data }); res.json({ settings }); }
