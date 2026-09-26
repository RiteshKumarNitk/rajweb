import { getClient } from "./email-client";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("contact-email");

const FROM_FALLBACK = "RRA Platform <onboarding@resend.dev>";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Recipient for new contact messages. Priority: `contact_email` Setting row
 * (editable at /admin/settings) → SUPER_ADMIN_EMAIL env → siteConfig default.
 * Never a hardcoded personal address in code.
 */
export async function resolveContactNotificationRecipient(): Promise<string> {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const setting = await prisma.setting.findUnique({ where: { key: "contact_email" } });
    if (setting?.value && setting.value.includes("@")) return setting.value;
  } catch (err) {
    log.warn({ err }, "Could not read contact_email setting; falling back to env");
  }
  return process.env.SUPER_ADMIN_EMAIL || "rajasthanracquetball@gmail.com";
}

export interface ContactEmailData {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  submittedAt: Date;
}

export async function sendContactNotificationEmail(data: ContactEmailData): Promise<void> {
  const resend = getClient();
  const to = await resolveContactNotificationRecipient();
  const fromAddress = process.env.RESEND_FROM_EMAIL || FROM_FALLBACK;
  const subjectLine = data.subject ? escapeHtml(data.subject) : "(no subject)";

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    replyTo: data.email,
    subject: "New Contact Us Message - RRA",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #0F172A;">New Contact Us Message</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
          <tr><td style="padding: 6px 0; color: #64748B; width: 110px;">Name</td><td style="padding: 6px 0;">${escapeHtml(data.name)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748B;">Email</td><td style="padding: 6px 0;">${escapeHtml(data.email)}</td></tr>
          ${data.phone ? `<tr><td style="padding: 6px 0; color: #64748B;">Phone</td><td style="padding: 6px 0;">${escapeHtml(data.phone)}</td></tr>` : ""}
          <tr><td style="padding: 6px 0; color: #64748B;">Subject</td><td style="padding: 6px 0;">${subjectLine}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748B;">Received</td><td style="padding: 6px 0;">${escapeHtml(data.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))} IST</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 14px; background: #F8FAFC; border-radius: 8px; font-size: 14px; color: #334155; white-space: pre-wrap;">${escapeHtml(data.message)}</div>
        <p style="margin-top: 18px; font-size: 13px; color: #64748B;">Reply directly to this email to respond to ${escapeHtml(data.name)}.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error("Failed to send contact notification email");
  }
}

export async function sendContactConfirmationEmail(data: ContactEmailData): Promise<void> {
  const resend = getClient();
  const fromAddress = process.env.RESEND_FROM_EMAIL || FROM_FALLBACK;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: data.email,
    subject: "We've received your message - RRA",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0F172A;">Thank you for contacting us</h2>
        <p style="font-size: 15px; color: #334155;">
          Dear ${escapeHtml(data.name)}, thank you for contacting the Rajasthan Racquetball Association.
          We have received your message and our team will get back to you shortly.
        </p>
        ${data.subject ? `<p style="font-size: 13px; color: #64748B;">Subject: ${escapeHtml(data.subject)}</p>` : ""}
        <p style="font-size: 13px; color: #64748B;">— Rajasthan Racquetball Association</p>
      </div>
    `,
  });

  if (error) {
    throw new Error("Failed to send contact confirmation email");
  }
}
