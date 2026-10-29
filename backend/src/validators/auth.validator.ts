import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required")
});
export const verifySchema = z.object({ token: z.string().min(32).max(200) });
export const resendSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(12, "New password must be at least 12 characters")
    .max(128, "New password must be no more than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S+$/,
      "Use uppercase and lowercase letters, a number, and a symbol without spaces"
    )
}).refine((data) => data.currentPassword !== data.newPassword, {
  path: ["newPassword"],
  message: "New password must be different from the current password"
});
