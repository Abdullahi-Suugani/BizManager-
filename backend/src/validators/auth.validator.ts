import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required")
});
export const verifySchema = z.object({ token: z.string().min(32).max(200) });
export const resendSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) });
