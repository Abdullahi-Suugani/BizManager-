import { z } from "zod";

export const reportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).refine((value) => !value.from || !value.to || value.from <= value.to, { path: ["to"], message: "The end date must be on or after the start date" });
