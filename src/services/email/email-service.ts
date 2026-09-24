import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Email is not configured: set RESEND_API_KEY (see Resend dashboard → API Keys) to enable OTP login."
    );
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

/**
 * Sends a login OTP. Scoped to exactly this one use case — not a general
 * notification system. The OTP value itself must never be logged; callers
 * pass it only here, and nothing here writes it to logger/Sentry.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const resend = getClient();
  const fromAddress = process.env.RESEND_FROM_EMAIL || "RRA Platform <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject: "Your RRA sign-in code",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0F172A;">Your sign-in code</h2>
        <p style="font-size: 15px; color: #334155;">Use this code to sign in to your Rajasthan Racquetball Association account. It expires in 10 minutes.</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0F172A; margin: 24px 0;">${otp}</p>
        <p style="font-size: 13px; color: #64748B;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error("Failed to send OTP email");
  }
}
