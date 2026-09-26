import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { assertDistrictAccess } from "@/security/rbac/district-scope";
import { approvePlayer, rejectPlayer } from "@/modules/players/player.service";
import { issuePlayerCertificate } from "@/services/certificates/certificate-service";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { createAuditLog } from "@/services/audit/audit-service";

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.PLAYERS_APPROVE);
    const id = params?.id as string | undefined;
    const action = params?.action as string | undefined;

    if (!id || !action) {
      throw AppError.badRequest("Player ID and action are required");
    }

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      throw AppError.notFound("Player not found");
    }

    assertDistrictAccess(user, player.districtId);

    if (action === "approve") {
      await approvePlayer(id, user.id);
      await createAuditLog({
        userId: user.id,
        action: "APPROVE",
        module: "players",
        entityId: id,
      });
      return jsonSuccess({ playerId: id, status: "APPROVED" }, requestId, "Player approved");
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
      if (reason.length > 1000) {
        throw AppError.badRequest("Rejection reason must be 1000 characters or fewer");
      }

      await rejectPlayer(id, reason);
      await createAuditLog({
        userId: user.id,
        action: "REJECT",
        module: "players",
        entityId: id,
        details: { reason },
      });
      return jsonSuccess({ playerId: id, status: "REJECTED" }, requestId, "Player rejected");
    }

    if (action === "certificate") {
      if (!hasPermission(user, PERMISSIONS.CERTIFICATES_ISSUE)) {
        throw AppError.forbidden();
      }

      let body: { certificateNumber?: string; issuedAt?: string; expiresAt?: string } = {};
      try {
        body = await request.json();
      } catch {
        // empty body is fine — auto-generate values
      }

      const cert = await issuePlayerCertificate(id, user.id, {
        certificateNumber: body.certificateNumber,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      });

      await createAuditLog({
        userId: user.id,
        action: "CREATE",
        module: "certificates",
        entityId: cert.id,
        details: { certificateNumber: cert.certificateNumber },
      });

      return jsonSuccess(
        {
          certificateNumber: cert.certificateNumber,
          qrCode: cert.qrCode,
          issuedAt: cert.issuedAt,
          expiresAt: cert.expiresAt,
          pdfUrl: cert.pdfPath ? getStorage().getUrl(cert.pdfPath) : undefined,
        },
        requestId,
        `Certificate ${cert.certificateNumber} issued`
      );
    }

    throw AppError.badRequest("Invalid action");
  },
  { module: "admin-players", requireCsrf: true }
);
