import { z } from "zod";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { resolveOwnership } from "@/security/rbac/ownership.server";
import { createAuditLog } from "@/services/audit/audit-service";
import { createMediaAsset, mediaUrl } from "@/modules/media/media-asset.service";
import { ASSET_CATEGORIES, createAsset } from "@/modules/certificates/certificate-template.service";

const pathSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(ASSET_CATEGORIES),
  imagePath: z.string().trim().max(300).regex(/^\/images\/[\w./-]+\.(png|jpe?g)$/i, "Use a PNG/JPEG path under /images/"),
});

/**
 * Certificate images, stored with the existing media system (MediaAsset,
 * kind CERTIFICATE_IMAGE — PNG/JPEG, immutable).
 *  - multipart `file` + `name` + `category`: adds an image to the template
 *    library (certificate-templates:manage);
 *  - multipart `file` + `purpose=signature`: uploads a signature image for a
 *    signatory (certificates:issue), owned by the uploader's scope, and
 *    returns its URL for the signatory form;
 *  - JSON `{ name, category, imagePath }`: registers a bundled /images/ file
 *    in the library (certificate-templates:manage).
 */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const isMultipart = (request.headers.get("content-type") ?? "").includes("multipart/form-data");

    if (!isMultipart) {
      if (!hasPermission(user, PERMISSIONS.CERTIFICATE_TEMPLATES_MANAGE)) throw AppError.forbidden();
      const body = pathSchema.parse(await request.json());
      const asset = await createAsset(body, user.id);
      await createAuditLog({
        userId: user.id,
        action: "CREATE",
        module: "certificates",
        entityType: "CertificateAsset",
        entityId: asset.id,
        details: { event: "CERTIFICATE_ASSET_CREATED", name: asset.name, imagePath: asset.imagePath },
      });
      return jsonSuccess({ id: asset.id }, requestId, `Image "${asset.name}" added`);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw AppError.badRequest("Send the file as multipart/form-data");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw AppError.badRequest("Choose a file to upload");
    const isSignature = form.get("purpose") === "signature";
    if (!hasPermission(user, isSignature ? PERMISSIONS.CERTIFICATES_ISSUE : PERMISSIONS.CERTIFICATE_TEMPLATES_MANAGE)) throw AppError.forbidden();

    const owner = isSignature ? await resolveOwnership(user, {}, { allowCentral: true }) : { stateId: null, districtId: null };
    const media = await createMediaAsset({
      kind: "CERTIFICATE_IMAGE",
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      owner,
      uploadedById: user.id,
    });

    if (isSignature) {
      await createAuditLog({
        userId: user.id,
        action: "CREATE",
        module: "certificates",
        entityType: "MediaAsset",
        entityId: media.id,
        details: { event: "SIGNATURE_IMAGE_UPLOADED", size: media.size, ...owner },
      });
      return jsonSuccess({ url: mediaUrl(media.id) }, requestId, "Signature image uploaded");
    }

    const meta = z
      .object({ name: z.string().trim().min(2).max(100), category: z.enum(ASSET_CATEGORIES) })
      .parse({ name: form.get("name"), category: form.get("category") });
    const asset = await createAsset({ ...meta, mediaAssetId: media.id }, user.id);
    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "certificates",
      entityType: "CertificateAsset",
      entityId: asset.id,
      details: { event: "CERTIFICATE_ASSET_UPLOADED", name: asset.name, mediaAssetId: media.id, size: media.size },
    });
    return jsonSuccess({ id: asset.id }, requestId, `Image "${asset.name}" uploaded`);
  },
  { module: "admin-certificate-assets", requireCsrf: true, rateLimit: { limit: 30, windowMs: 60000 } }
);
