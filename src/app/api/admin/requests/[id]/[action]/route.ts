import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertDistrictAccess } from "@/security/rbac/district-scope";
import { approveRequest, rejectRequest } from "@/modules/requests/request.service";
import { createAuditLog } from "@/services/audit/audit-service";

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.REQUESTS_APPROVE);
    const id = params?.id as string | undefined;
    const action = params?.action as string | undefined;

    if (!id || !action) {
      throw AppError.badRequest("Request ID and action are required");
    }

    const serviceRequest = await prisma.request.findUnique({
      where: { id },
      include: { player: true, coach: true },
    });
    if (!serviceRequest) {
      throw AppError.notFound("Request not found");
    }

    const districtId = serviceRequest.player?.districtId ?? serviceRequest.coach?.districtId;
    if (districtId) {
      assertDistrictAccess(user, districtId);
    }

    if (action === "approve") {
      let body: { remarks?: string } = {};
      try {
        body = await request.json();
      } catch {
        // no body — remarks are optional
      }

      await approveRequest(id, user.id, body.remarks);
      await createAuditLog({
        userId: user.id,
        action: "APPROVE",
        module: "requests",
        entityId: id,
        details: { event: "REQUEST_APPROVED", type: serviceRequest.type },
      });
      return jsonSuccess({ requestId: id, status: "APPROVED" }, requestId, "Request approved");
    }

    if (action === "reject") {
      let body: { reason?: string } = {};
      try {
        body = await request.json();
      } catch {
        // empty body — validated below
      }
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) {
        throw AppError.badRequest("A rejection reason is required");
      }

      await rejectRequest(id, user.id, reason);
      await createAuditLog({
        userId: user.id,
        action: "REJECT",
        module: "requests",
        entityId: id,
        details: { event: "REQUEST_REJECTED", type: serviceRequest.type, reason },
      });
      return jsonSuccess({ requestId: id, status: "REJECTED" }, requestId, "Request rejected");
    }

    throw AppError.badRequest("Invalid action");
  },
  { module: "admin-requests", requireCsrf: true }
);
