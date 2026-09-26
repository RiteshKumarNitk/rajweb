import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import {
  contactStatusSchema,
  updateContactStatus,
  deleteContactMessage,
} from "@/modules/contact/contact-admin.service";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTACT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Contact message ID is required");

    const { status } = contactStatusSchema.parse(await request.json());
    const updated = await updateContactStatus(id, status, user.id);

    return jsonSuccess(
      { id, status: updated.status },
      requestId,
      `Message marked as ${status.toLowerCase()}`
    );
  },
  { module: "admin-contact", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CONTACT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Contact message ID is required");

    await deleteContactMessage(id, user.id);

    return jsonSuccess({ id, deleted: true }, requestId, "Message deleted");
  },
  { module: "admin-contact", requireCsrf: true }
);
