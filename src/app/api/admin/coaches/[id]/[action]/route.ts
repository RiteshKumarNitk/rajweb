import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertDistrictAccess } from "@/security/rbac/district-scope";
import { approveCoach, rejectCoach } from "@/modules/coaches/coach.service";
import { createAuditLog } from "@/services/audit/audit-service";

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.COACHES_APPROVE);
    const id = params?.id as string | undefined;
    const action = params?.action as string | undefined;

    if (!id || !action) {
      throw AppError.badRequest("Coach ID and action are required");
    }

    const coach = await prisma.coach.findUnique({ where: { id } });
    if (!coach) {
      throw AppError.notFound("Coach not found");
    }

    assertDistrictAccess(user, coach.districtId);

    if (action === "approve") {
      await approveCoach(id, user.id);
      await createAuditLog({
        userId: user.id,
        action: "APPROVE",
        module: "coaches",
        entityId: id,
      });
      return jsonSuccess({ coachId: id, status: "APPROVED" }, requestId, "Coach approved");
    }

    if (action === "reject") {
      let body: { reason?: string } = {};
      try {
        body = await request.json();
      } catch {
        // no body — reason stays empty
      }
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";

      await rejectCoach(id, reason);
      await createAuditLog({
        userId: user.id,
        action: "REJECT",
        module: "coaches",
        entityId: id,
        details: reason ? { reason } : undefined,
      });
      return jsonSuccess({ coachId: id, status: "REJECTED" }, requestId, "Coach rejected");
    }

    throw AppError.badRequest("Invalid action");
  },
  { module: "admin-coaches", requireCsrf: true }
);
