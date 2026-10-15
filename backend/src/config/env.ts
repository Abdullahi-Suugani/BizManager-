import "dotenv/config";
import { z } from "zod";

const emailFromSchema = z.string().trim().refine((value) => {
  if (z.string().email().safeParse(value).success) return true;
  const match = value.match(/^(.+?)\s*<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>$/);
  return Boolean(match && match[1].trim() && !/[<>\r\n]/.test(match[1]));
}, "EMAIL_FROM must be a valid email address or display name followed by an email address");
const booleanEnv = z.enum(["true", "false"]).default("true").transform((value) => value === "true");

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: emailFromSchema,
  EMAIL_VERIFICATION_REQUIRED: booleanEnv,
  VERIFICATION_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60)
});

const result = envSchema.safeParse(process.env);
if (!result.success) throw new Error(`Invalid backend environment configuration. Check: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
if (result.data.EMAIL_VERIFICATION_REQUIRED && !result.data.RESEND_API_KEY) throw new Error("Invalid backend environment configuration. Check: RESEND_API_KEY");
export const env = result.data;

// Supabase's transaction pooler requires an explicit TLS mode on Windows.
// Normalize only the connection options; credentials and the database target
// remain exactly as configured by the operator.
if (!process.env.DATABASE_URL?.toLowerCase().includes("sslmode=")) {
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes("?") ? "&" : "?"}sslmode=require`;
}
