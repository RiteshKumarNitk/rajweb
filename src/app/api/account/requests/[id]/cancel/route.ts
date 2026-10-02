import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { cancelOwnRequest } from "@/modules/requests/request.service";
import { createAuditLog } from "@/services/audit/audit-service";

/**
 * A member withdraws one of their own requests while it is still PENDING.
 * Ownership comes from the session (the request must belong to the signed-in
 * user); another user's request is a 404, a processed one a 409. The request
 * is kept, with status CANCELLED.
 */
export const POST = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requireAuth();
    const id = String(params?.id ?? "");
    if (!id) throw AppError.notFound("Request not found");

    const cancelled = await cancelOwnRequest(id, user.id);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "requests",
      entityId: cancelled.id,
      details: { event: "REQUEST_CANCELLED", type: cancelled.type, requestNumber: cancelled.requestNumber },
    });

    return jsonSuccess({ requestNumber: cancelled.requestNumber, status: cancelled.status }, requestId, "Request cancelled");
  },
  { module: "requests-cancel", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
