import { Resend } from "resend";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const url = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

  try {
    if (!resend) throw new Error("RESEND_API_KEY is not configured");
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [email],
      subject: "Verify your BizManager account",
      html: `<p>Hello ${name},</p><p><a href="${url}">Verify your email address</a></p><p>This link expires in ${env.VERIFICATION_TOKEN_TTL_MINUTES} minutes.</p>`
    });

    if (error) {
      console.error("Verification email delivery failed", { name: error.name, statusCode: error.statusCode });
      throw new HttpError(503, "Account created, but the verification email could not be sent. Please try again later.");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("Verification email delivery failed", { error: error instanceof Error ? error.name : "Unknown error" });
    throw new HttpError(503, "Account created, but the verification email could not be sent. Please try again later.");
  }
}
