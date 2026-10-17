import dotenv from "dotenv";
import { z } from "zod";

// Allow the explicitly named uppercase PORT entry to win on Windows, where
// environment variable names are case-insensitive and a legacy lowercase
// `port` connection-detail entry may otherwise occupy the same slot.
dotenv.config({ override: true });

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
  ALLOWED_ORIGINS: z.string().default(""),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: emailFromSchema,
  EMAIL_VERIFICATION_REQUIRED: booleanEnv,
  VERIFICATION_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60)
});

const result = envSchema.safeParse(process.env);
if (!result.success) throw new Error(`Invalid backend environment configuration. Check: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
if (result.data.EMAIL_VERIFICATION_REQUIRED && !result.data.RESEND_API_KEY) throw new Error("Invalid backend environment configuration. Check: RESEND_API_KEY");
export const env = result.data;

// Supabase transaction pooler is the runtime path for this Windows environment.
// Keep pgbouncer=true from the operator configuration and require TLS.
function withRequiredTls(value: string | undefined) {
  if (!value || value.toLowerCase().includes("sslmode=")) return value;
  return `${value}${value.includes("?") ? "&" : "?"}sslmode=require`;
}

process.env.DATABASE_URL = withRequiredTls(process.env.DATABASE_URL);
process.env.DIRECT_URL = withRequiredTls(process.env.DIRECT_URL);
