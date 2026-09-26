import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { timelineSchema, createTimelineItem } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const input = timelineSchema.parse(await request.json());

    const item = await createTimelineItem(input);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "content",
      entityId: item.id,
      entityType: "TimelineItem",
      details: { event: "TIMELINE_ITEM_CREATED", year: item.year, title: item.title },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id: item.id }, requestId, `Timeline entry "${item.title}" added`);
  },
  { module: "admin-content", requireCsrf: true }
);
