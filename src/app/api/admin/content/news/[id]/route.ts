import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { newsUpdateSchema, updateNewsItem } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("News item ID is required");

    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("News item not found");

    const input = newsUpdateSchema.parse(await request.json());
    const updated = await updateNewsItem(id, input);

    const activated = input.isActive === true && !existing.isActive;
    const deactivated = input.isActive === false && existing.isActive;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "content",
      entityId: id,
      entityType: "News",
      details: {
        event: activated ? "NEWS_ITEM_ACTIVATED" : deactivated ? "NEWS_ITEM_DEACTIVATED" : "NEWS_ITEM_UPDATED",
        title: updated.title,
      },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, isActive: updated.isActive }, requestId, `News item "${updated.title}" updated`);
  },
  { module: "admin-content", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("News item ID is required");

    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("News item not found");

    await prisma.news.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "content",
      entityId: id,
      entityType: "News",
      details: { event: "NEWS_ITEM_DELETED", title: existing.title, slug: existing.slug },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id, deleted: true }, requestId, `News item "${existing.title}" deleted`);
  },
  { module: "admin-content", requireCsrf: true }
);
