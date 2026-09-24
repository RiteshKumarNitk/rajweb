import prisma from "@/infrastructure/database/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

interface AuditLogParams {
  userId?: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  entityType?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      module: params.module,
      entityId: params.entityId,
      entityType: params.entityType,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
