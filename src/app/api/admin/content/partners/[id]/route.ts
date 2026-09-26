import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { partnerUpdateSchema, updatePartner } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Partner ID is required");

    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Partner not found");

    const input = partnerUpdateSchema.parse(await request.json());
    const updated = await updatePartner(id, input);

    const activated = input.isActive === true && !existing.isActive;
    const deactivated = input.isActive === false && existing.isActive;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "content",
      entityId: id,
      entityType: "Partner",
      details: {
        event: activated ? "PARTNER_ACTIVATED" : deactivated ? "PARTNER_DEACTIVATED" : "PARTNER_UPDATED",
        name: updated.name,
        type: updated.type,
      },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, isActive: updated.isActive }, requestId, `Partner "${updated.name}" updated`);
  },
  { module: "admin-content", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Partner ID is required");

    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Partner not found");

    await prisma.partner.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "content",
      entityId: id,
      entityType: "Partner",
      details: { event: "PARTNER_DELETED", name: existing.name, type: existing.type },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, deleted: true }, requestId, `Partner "${existing.name}" deleted`);
  },
  { module: "admin-content", requireCsrf: true }
);
