import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { newsSchema, createNewsItem } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const input = newsSchema.parse(await request.json());

    const item = await createNewsItem(input);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "content",
      entityId: item.id,
      entityType: "News",
      details: { event: "NEWS_ITEM_CREATED", title: item.title, slug: item.slug, category: item.category },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id: item.id, slug: item.slug }, requestId, `News item "${item.title}" created`);
  },
  { module: "admin-content", requireCsrf: true }
);
