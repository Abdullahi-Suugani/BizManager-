import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use dates in YYYY-MM-DD format").optional();

export const transactionQuerySchema = z.object({
  invoiceNumber: z.string().trim().max(50).optional(),
  employeeId: z.string().cuid().optional(),
  item: z.string().trim().max(100).optional(),
  from: date,
  to: date,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
}).refine((value) => !value.from || !value.to || value.from <= value.to, { path: ["to"], message: "The end date must be on or after the start date" });
