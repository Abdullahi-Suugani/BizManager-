import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { transactionRouter } from "./routes/transaction.routes.js";
import { employeeRouter } from "./routes/employee.routes.js";
import { reportRouter } from "./routes/report.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { productRouter } from "./routes/product.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { prisma } from "./config/prisma.js";

export const app = express();

app.use(
  cors({
    origin: [env.FRONTEND_URL, ...env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)],
    credentials: true
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", service: "electronic-sales-api", database: "ok" });
  } catch (error) {
    console.error("Health database check failed", {
      error: error instanceof Error ? { name: error.name, message: error.message } : "Unknown database error"
    });
    res.status(503).json({ status: "degraded", service: "electronic-sales-api", database: "unavailable" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/reports", reportRouter);
app.use("/api/products", productRouter);
app.use("/api/settings", settingsRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);
