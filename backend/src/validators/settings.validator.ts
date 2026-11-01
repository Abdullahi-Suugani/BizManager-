import { z } from "zod";
export const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  contactEmail: z.string().trim().email().or(z.literal("")).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  currency: z.string().trim().length(3).regex(/^[A-Za-z]+$/),
  showBusinessContact: z.boolean(),
  showInvoiceLogo: z.boolean(),
  showPaymentStatus: z.boolean(),
  logoData: z.string().max(2_800_000).regex(/^data:image\/(?:png|jpeg|webp);base64,/).nullable().optional()
});
