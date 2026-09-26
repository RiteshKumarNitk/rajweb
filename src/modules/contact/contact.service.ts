import prisma from "@/infrastructure/database/prisma";
import { sanitizeEmail, sanitizeOptionalText, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";
import {
  sendContactNotificationEmail,
  sendContactConfirmationEmail,
} from "@/services/email/contact-emails";

const log = createModuleLogger("contact");

export interface CreateContactInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export async function createContactMessage(input: CreateContactInput) {
  const data = {
    name: sanitizeText(input.name),
    email: sanitizeEmail(input.email),
    phone: input.phone ? sanitizePhone(input.phone) : undefined,
    subject: sanitizeOptionalText(input.subject),
    message: sanitizeText(input.message),
  };

  // 1) Persist first — the visitor's submission must never be lost to an
  // email outage.
  const message = await prisma.contactMessage.create({ data });

  // 2) Best-effort emails, outside the critical path. Failures are logged and
  // surfaced via the `emailSent` flag on the record, never thrown to the
  // visitor, and never expose provider errors.
  try {
    await sendContactNotificationEmail({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      subject: data.subject ?? null,
      message: data.message,
      submittedAt: message.createdAt,
    });
    await prisma.contactMessage.update({
      where: { id: message.id },
      data: { emailSent: true },
    });
  } catch (err) {
    log.error(
      { contactId: message.id, err: err instanceof Error ? err.message : String(err) },
      "Super Admin contact notification email failed — message stored, emailSent=false"
    );
  }

  try {
    await sendContactConfirmationEmail({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      subject: data.subject ?? null,
      message: data.message,
      submittedAt: message.createdAt,
    });
  } catch (err) {
    // Visitor confirmation is optional; a failure here is invisible to them.
    log.warn(
      { contactId: message.id, err: err instanceof Error ? err.message : String(err) },
      "Visitor contact confirmation email failed"
    );
  }

  log.info({ contactId: message.id, email: data.email }, "Contact message created");
  return message;
}
