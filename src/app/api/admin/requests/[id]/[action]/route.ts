import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";
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
      include: {
        player: { include: { district: { select: { stateId: true } } } },
        coach: { include: { district: { select: { stateId: true } } } },
      },
    });
    if (!serviceRequest) {
      throw AppError.notFound("Request not found");
    }

    // A request is owned through its Player or Coach. One with neither
    // (should not exist) is treated as out of scope for everyone but GLOBAL.
    const owner = serviceRequest.player ?? serviceRequest.coach;
    assertInScope(
      user,
      { districtId: owner?.districtId ?? null, stateId: owner?.district?.stateId ?? null },
      "Request not found"
    );

    if (action === "approve") {
      let body: { remarks?: string } = {};
      try {
        body = await request.json();
      } catch {
        // no body — remarks are optional
      }

      const { changes } = await approveRequest(id, user.id, body.remarks);
      await createAuditLog({
        userId: user.id,
        action: "APPROVE",
        module: "requests",
        entityId: id,
        details: {
          event: "REQUEST_APPROVED",
          type: serviceRequest.type,
          requestedBy: serviceRequest.userId,
          // Field-level before/after of what the approval applied (empty when informational).
          changes: changes.map((c) => ({ field: c.field, previousValue: c.previousValue, newValue: c.newValue })),
          stateId: owner?.district?.stateId ?? null,
          districtId: owner?.districtId ?? null,
        },
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
        details: {
          event: "REQUEST_REJECTED",
          type: serviceRequest.type,
          reason,
          stateId: owner?.district?.stateId ?? null,
          districtId: owner?.districtId ?? null,
        },
      });
      return jsonSuccess({ requestId: id, status: "REJECTED" }, requestId, "Request rejected");
    }

    throw AppError.badRequest("Invalid action");
  },
  { module: "admin-requests", requireCsrf: true }
);
