import { z } from "zod";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { templateBodySchema } from "@/modules/certificates/certificate-entry.schema";
import {
  createTemplateVersion,
  duplicateTemplate,
  getTemplate,
  setDefaultTemplate,
  setTemplateStatus,
  updateTemplate,
} from "@/modules/certificates/certificate-template.service";

const actionSchema = z.discriminatedUnion("action", [
  templateBodySchema.extend({ action: z.literal("update") }),
  templateBodySchema.extend({ action: z.literal("new-version"), moveTournaments: z.boolean().optional() }),
  z.object({ action: z.literal("duplicate"), name: z.string().trim().min(3).max(120) }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("deactivate") }),
  z.object({ action: z.literal("set-default") }),
]);

/**
 * Template actions. `update` edits a version only while no certificate uses
 * it; `new-version` saves changes as the next version (optionally moving the
 * tournaments that used the old one). Issued certificates never change.
 */
export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CERTIFICATE_TEMPLATES_MANAGE);
    const id = String(params?.id ?? "");
    if (!id) throw AppError.badRequest("Template ID is required");
    const before = await getTemplate(id);
    const body = actionSchema.parse(await request.json());

    let resultId = id;
    let message: string;
    switch (body.action) {
      case "update":
        await updateTemplate(id, body);
        message = `Template "${body.name}" v${before.version} saved`;
        break;
      case "new-version": {
        const created = await createTemplateVersion(id, body, user.id, { moveTournaments: body.moveTournaments });
        resultId = created.id;
        message = `Saved as "${created.name}" v${created.version}`;
        break;
      }
      case "duplicate": {
        const created = await duplicateTemplate(id, body.name, user.id);
        resultId = created.id;
        message = `Duplicated as "${created.name}"`;
        break;
      }
      case "activate":
      case "deactivate":
        await setTemplateStatus(id, body.action === "activate" ? "ACTIVE" : "INACTIVE");
        message = `Template ${body.action === "activate" ? "activated" : "deactivated"}`;
        break;
      case "set-default":
        await setDefaultTemplate(id);
        message = `"${before.name}" v${before.version} is now the default template`;
        break;
    }

    await createAuditLog({
      userId: user.id,
      action: body.action === "duplicate" || body.action === "new-version" ? "CREATE" : "UPDATE",
      module: "certificates",
      entityType: "CertificateTemplate",
      entityId: resultId,
      details: { event: `CERTIFICATE_TEMPLATE_${body.action.toUpperCase().replace("-", "_")}`, sourceTemplateId: id, name: before.name, version: before.version },
    });
    return jsonSuccess({ id: resultId }, requestId, message);
  },
  { module: "admin-certificate-templates", requireCsrf: true }
);
