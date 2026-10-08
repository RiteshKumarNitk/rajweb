import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { createTemplate } from "@/modules/certificates/certificate-template.service";
import { templateBodySchema } from "@/modules/certificates/certificate-entry.schema";

/** Creates a new certificate template family (version 1). Template managers only. */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.CERTIFICATE_TEMPLATES_MANAGE);
    const body = templateBodySchema.parse(await request.json());
    const created = await createTemplate(body, user.id);
    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "certificates",
      entityType: "CertificateTemplate",
      entityId: created.id,
      details: { event: "CERTIFICATE_TEMPLATE_CREATED", name: created.name, version: created.version },
    });
    return jsonSuccess({ id: created.id }, requestId, `Template "${created.name}" created`);
  },
  { module: "admin-certificate-templates", requireCsrf: true }
);
