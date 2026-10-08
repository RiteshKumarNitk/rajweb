import { z } from "zod";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { ASSET_CATEGORIES, updateAsset } from "@/modules/certificates/certificate-template.service";

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    category: z.enum(ASSET_CATEGORIES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

/**
 * Renames or (de)activates a library image. Images are never deleted: issued
 * certificates reference them through their snapshot. A deactivated image can
 * no longer be picked for new template versions.
 */
export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CERTIFICATE_TEMPLATES_MANAGE);
    const id = String(params?.id ?? "");
    if (!id) throw AppError.badRequest("Image ID is required");
    const data = updateSchema.parse(await request.json());
    const asset = await updateAsset(id, data);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "certificates",
      entityType: "CertificateAsset",
      entityId: id,
      details: { event: "CERTIFICATE_ASSET_UPDATED", ...data },
    });
    return jsonSuccess({ id: asset.id }, requestId, `Image "${asset.name}" updated`);
  },
  { module: "admin-certificate-assets", requireCsrf: true }
);
