import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { timelineUpdateSchema, updateTimelineItem } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Timeline entry ID is required");

    const existing = await prisma.timelineItem.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Timeline entry not found");

    const input = timelineUpdateSchema.parse(await request.json());
    const updated = await updateTimelineItem(id, input);

    const activated = input.isActive === true && !existing.isActive;
    const deactivated = input.isActive === false && existing.isActive;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "content",
      entityId: id,
      entityType: "TimelineItem",
      details: {
        event: activated ? "TIMELINE_ITEM_ACTIVATED" : deactivated ? "TIMELINE_ITEM_DEACTIVATED" : "TIMELINE_ITEM_UPDATED",
        title: updated.title,
      },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, isActive: updated.isActive }, requestId, `Timeline entry "${updated.title}" updated`);
  },
  { module: "admin-content", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Timeline entry ID is required");

    const existing = await prisma.timelineItem.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Timeline entry not found");

    await prisma.timelineItem.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "content",
      entityId: id,
      entityType: "TimelineItem",
      details: { event: "TIMELINE_ITEM_DELETED", year: existing.year, title: existing.title },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, deleted: true }, requestId, `Timeline entry "${existing.title}" deleted`);
  },
  { module: "admin-content", requireCsrf: true }
);
