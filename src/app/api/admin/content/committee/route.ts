import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { committeeSchema, createCommitteeMember } from "@/modules/content/content.service";
import { revalidateWebsiteContent } from "@/modules/content/public-content";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const input = committeeSchema.parse(await request.json());

    const member = await createCommitteeMember(input);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "content",
      entityId: member.id,
      entityType: "ExecutiveMember",
      details: { event: "COMMITTEE_MEMBER_CREATED", name: member.name, designation: member.designation },
    });

    revalidateWebsiteContent();

    return jsonSuccess({ id: member.id, name: member.name }, requestId, `Committee member "${member.name}" added`);
  },
  { module: "admin-content", requireCsrf: true }
);
