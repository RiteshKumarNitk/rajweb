import prisma from "@/infrastructure/database/prisma";
import { sanitizeEmail, sanitizeOptionalText, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";

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

  const message = await prisma.contactMessage.create({ data });

  log.info({ contactId: message.id, email: data.email }, "Contact message created");
  return message;
}
