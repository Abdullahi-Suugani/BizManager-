import { z } from "zod";
export const productSchema = z.object({ name: z.string().trim().min(1).max(120), code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9._-]+$/), unitPrice: z.coerce.number().finite().min(0), stockQuantity: z.coerce.number().finite().min(0) });
export const productIdSchema = z.object({ id: z.string().min(1) });
export const productQuerySchema = z.object({ search: z.string().trim().max(120).optional(), includeInactive: z.enum(["true", "false"]).optional() });
