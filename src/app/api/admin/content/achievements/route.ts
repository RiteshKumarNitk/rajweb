import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { achievementSchema, createAchievement } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const input = achievementSchema.parse(await request.json());

    const item = await createAchievement(input);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "content",
      entityId: item.id,
      entityType: "Achievement",
      details: { event: "ACHIEVEMENT_CREATED", label: item.label, value: item.value },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id: item.id }, requestId, `Statistic "${item.label}" added`);
  },
  { module: "admin-content", requireCsrf: true }
);
