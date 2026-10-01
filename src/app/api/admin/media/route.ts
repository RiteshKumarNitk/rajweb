import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { resolveOwnership } from "@/security/rbac/ownership.server";
import { createAuditLog } from "@/services/audit/audit-service";
import { createMediaAsset, mediaUrl, type MediaKind } from "@/modules/media/media-asset.service";

const KINDS: Record<string, MediaKind> = {
  "equipment-image": "EQUIPMENT_IMAGE",
  "requirement-attachment": "REQUIREMENT_ATTACHMENT",
};

/**
 * Upload (multipart/form-data: `file`, `kind`). The file is owned by the
 * uploader's scope (district admin → own district), stored in the database
 * and served from /api/media/{id}.
 */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw AppError.badRequest("Send the file as multipart/form-data");
    }
    const kind = KINDS[String(form.get("kind") ?? "")];
    if (!kind) throw AppError.badRequest("Unknown upload kind");
    const file = form.get("file");
    if (!(file instanceof File)) throw AppError.badRequest("Choose a file to upload");

    const owner = await resolveOwnership(user, {}, { allowCentral: true });
    const asset = await createMediaAsset({
      kind,
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      owner,
      uploadedById: user.id,
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "media",
      entityId: asset.id,
      entityType: "MediaAsset",
      details: { event: "MEDIA_UPLOADED", kind, size: asset.size, mimeType: asset.mimeType, ...owner },
    });

    return jsonSuccess({ id: asset.id, url: mediaUrl(asset.id), mimeType: asset.mimeType, size: asset.size, fileName: asset.fileName }, requestId, "Uploaded");
  },
  { module: "admin-media", rateLimit: { limit: 30, windowMs: 60000 }, requireCsrf: true }
);
