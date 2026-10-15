import { z } from "zod";

export const createTransactionSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  customerPhone: z.string().trim().optional(),
  customerAddress: z.string().trim().optional(),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  isPaid: z.boolean().default(false),
  paymentMethod: z.string().trim().min(1, "Payment method is required").default("Cash"),
  items: z
    .array(
      z.object({
        productId: z.string().cuid().optional(),
        itemName: z.string().trim().min(1, "Item name is required"),
        quantity: z.number().positive("Quantity must be greater than zero"),
        unitPrice: z.number().min(0, "Unit price cannot be negative")
      })
    )
    .min(1, "Transaction must contain at least one item")
});
