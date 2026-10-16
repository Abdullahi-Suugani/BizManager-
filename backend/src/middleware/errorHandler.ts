import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";
import { Prisma } from "@prisma/client";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ message: "An account with this email already exists. Please sign in or resend verification." });
    return;
  }

  console.error("Unhandled API error", {
    method: req.method,
    path: req.path,
    error: error instanceof Error ? { name: error.name, message: error.message } : "Unknown error"
  });
  res.status(500).json({ message: "Something went wrong" });
};
