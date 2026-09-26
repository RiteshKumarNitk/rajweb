import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { achievementUpdateSchema, updateAchievement } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Achievement ID is required");

    const existing = await prisma.achievement.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Achievement not found");

    const input = achievementUpdateSchema.parse(await request.json());
    const updated = await updateAchievement(id, input);

    const activated = input.isActive === true && !existing.isActive;
    const deactivated = input.isActive === false && existing.isActive;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "content",
      entityId: id,
      entityType: "Achievement",
      details: {
        event: activated ? "ACHIEVEMENT_ACTIVATED" : deactivated ? "ACHIEVEMENT_DEACTIVATED" : "ACHIEVEMENT_UPDATED",
        label: updated.label,
      },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, isActive: updated.isActive }, requestId, `Statistic "${updated.label}" updated`);
  },
  { module: "admin-content", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Achievement ID is required");

    const existing = await prisma.achievement.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Achievement not found");

    await prisma.achievement.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "content",
      entityId: id,
      entityType: "Achievement",
      details: { event: "ACHIEVEMENT_DELETED", label: existing.label },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, deleted: true }, requestId, `Statistic "${existing.label}" deleted`);
  },
  { module: "admin-content", requireCsrf: true }
);
