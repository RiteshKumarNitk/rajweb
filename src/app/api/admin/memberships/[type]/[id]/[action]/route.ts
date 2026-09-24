import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertDistrictAccess } from "@/security/rbac/district-scope";
import {
  approveMembership,
  rejectMembership,
  findMembership,
  isMembershipReviewType,
} from "@/modules/memberships/membership-review.server";
import { createAuditLog } from "@/services/audit/audit-service";

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_APPROVE);
    const type = params?.type as string | undefined;
    const id = params?.id as string | undefined;
    const action = params?.action as string | undefined;

    if (!type || !id || !action || !isMembershipReviewType(type)) {
      throw AppError.badRequest("Membership type, ID and action are required");
    }

    const membership = await findMembership(type, id);
    if (!membership) {
      throw AppError.notFound("Membership application not found");
    }

    assertDistrictAccess(user, membership.districtId);

    if (action === "approve") {
      await approveMembership(type, id, user.id);
      await createAuditLog({
        userId: user.id,
        action: "APPROVE",
        module: "memberships",
        entityId: id,
        details: { type },
      });
      return jsonSuccess({ membershipId: id, status: "APPROVED" }, requestId, "Membership approved");
    }

    if (action === "reject") {
      let body: { reason?: string } = {};
      try {
        body = await request.json();
      } catch {
        // no body — reason stays empty
      }
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";

      await rejectMembership(type, id, reason);
      await createAuditLog({
        userId: user.id,
        action: "REJECT",
        module: "memberships",
        entityId: id,
        details: reason ? { type, reason } : { type },
      });
      return jsonSuccess({ membershipId: id, status: "REJECTED" }, requestId, "Membership rejected");
    }

    throw AppError.badRequest("Invalid action");
  },
  { module: "admin-memberships", requireCsrf: true }
);
