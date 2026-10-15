import type { RequestHandler } from "express";
import { HttpError } from "../utils/httpError.js";

const attempts = new Map<string, number[]>();
export function rateLimit(windowMs: number, max: number): RequestHandler {
  return (req, _res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const recent = (attempts.get(key) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= max) return next(new HttpError(429, "Too many requests. Please try again later."));
    recent.push(now); attempts.set(key, recent); next();
  };
}
