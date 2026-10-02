import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { createAuditLog } from "@/services/audit/audit-service";
import { createMediaAsset } from "@/modules/media/media-asset.service";
import { getRegistrationChoice, registrationLockedMessage } from "@/modules/applications/registration-choice.server";

/**
 * Member upload of a Government ID document (multipart/form-data: `file`) for
 * a Player or Coach application. The file is private: it is served only to
 * this member and, once attached to an application, to that application's
 * reviewers. It is attached when the application is submitted.
 */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const choice = await getRegistrationChoice(user.id);
    if (!choice.allowed.includes("player") && !choice.allowed.includes("coach")) {
      throw AppError.conflict(registrationLockedMessage(choice));
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw AppError.badRequest("Send the file as multipart/form-data");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw AppError.badRequest("Choose a file to upload");

    const asset = await createMediaAsset({
      kind: "GOVERNMENT_ID",
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      owner: { stateId: null, districtId: null },
      uploadedById: user.id,
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "media",
      entityId: asset.id,
      entityType: "MediaAsset",
      details: { event: "GOVERNMENT_ID_UPLOADED", size: asset.size, mimeType: asset.mimeType },
    });

    return jsonSuccess({ id: asset.id, fileName: asset.fileName, mimeType: asset.mimeType, size: asset.size }, requestId, "Document uploaded");
  },
  { module: "account-government-id", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
