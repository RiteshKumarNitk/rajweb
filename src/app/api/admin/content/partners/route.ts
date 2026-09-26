import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { partnerSchema, createPartner } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const input = partnerSchema.parse(await request.json());

    const item = await createPartner(input);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "content",
      entityId: item.id,
      entityType: "Partner",
      details: { event: "PARTNER_CREATED", name: item.name, type: item.type },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id: item.id }, requestId, `Partner "${item.name}" added`);
  },
  { module: "admin-content", requireCsrf: true }
);
