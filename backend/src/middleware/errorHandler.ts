import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error("Unhandled API error", {
    method: req.method,
    path: req.path,
    error: error instanceof Error ? { name: error.name, message: error.message } : "Unknown error"
  });
  res.status(500).json({ message: "Something went wrong" });
};
