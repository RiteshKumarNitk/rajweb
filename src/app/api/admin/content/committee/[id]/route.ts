import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { committeeUpdateSchema, updateCommitteeMember } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Committee member ID is required");

    const existing = await prisma.executiveMember.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Committee member not found");

    const input = committeeUpdateSchema.parse(await request.json());
    const updated = await updateCommitteeMember(id, input);

    const activated = input.isActive === true && !existing.isActive;
    const deactivated = input.isActive === false && existing.isActive;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "content",
      entityId: id,
      entityType: "ExecutiveMember",
      details: {
        event: activated
          ? "COMMITTEE_MEMBER_ACTIVATED"
          : deactivated
            ? "COMMITTEE_MEMBER_DEACTIVATED"
            : "COMMITTEE_MEMBER_UPDATED",
        name: updated.name,
        previousValues: { isActive: existing.isActive, sortOrder: existing.sortOrder },
        newValues: { isActive: updated.isActive, sortOrder: updated.sortOrder },
      },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, name: updated.name, isActive: updated.isActive }, requestId, `Committee member "${updated.name}" updated`);
  },
  { module: "admin-content", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Committee member ID is required");

    const existing = await prisma.executiveMember.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Committee member not found");

    await prisma.executiveMember.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "content",
      entityId: id,
      entityType: "ExecutiveMember",
      details: { event: "COMMITTEE_MEMBER_DELETED", name: existing.name },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, deleted: true }, requestId, `Committee member "${existing.name}" deleted`);
  },
  { module: "admin-content", requireCsrf: true }
);
