import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { createAuditLog } from "@/services/audit/audit-service";
import type { ContactStatus } from "@prisma/client";

export const contactStatusSchema = z.object({
  status: z.enum(["NEW", "READ", "REPLIED", "CLOSED"]),
});

export async function listContactMessages(take = 200) {
  return prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      status: true,
      emailSent: true,
      createdAt: true,
    },
  });
}

export async function getContactMessage(id: string) {
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message) throw AppError.notFound("Contact message not found");
  return message;
}

export async function updateContactStatus(
  id: string,
  status: ContactStatus,
  adminId: string
) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Contact message not found");
  if (existing.status === status) {
    return existing; // no-op
  }

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: { status, isRead: status !== "NEW" },
  });

  await createAuditLog({
    userId: adminId,
    action: "UPDATE",
    module: "contact",
    entityId: id,
    entityType: "ContactMessage",
    details: {
      event: "CONTACT_STATUS_CHANGED",
      previousValue: existing.status,
      newValue: status,
    },
  });

  return updated;
}

export async function deleteContactMessage(id: string, adminId: string) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Contact message not found");

  await prisma.contactMessage.delete({ where: { id } });

  await createAuditLog({
    userId: adminId,
    action: "DELETE",
    module: "contact",
    entityId: id,
    entityType: "ContactMessage",
    details: {
      event: "CONTACT_MESSAGE_DELETED",
      name: existing.name,
      email: existing.email,
    },
  });
}
