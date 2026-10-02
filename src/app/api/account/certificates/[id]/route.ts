import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";

/**
 * GET — one of the signed-in member's own player certificates (details as
 * issued). The certificate is looked up together with the session user's
 * player, so another member's certificate id is a 404. Read-only.
 */
export const GET = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requireAuth();
    const id = String(params?.id ?? "");
    const cert = await prisma.playerCertificate.findFirst({
      where: { id, player: { userId: user.id } },
      select: {
        id: true,
        certificateNumber: true,
        title: true,
        tournamentId: true,
        eventName: true,
        eventStartDate: true,
        eventEndDate: true,
        venue: true,
        districtName: true,
        stateName: true,
        position: true,
        recipientName: true,
        issuedAt: true,
        expiresAt: true,
        isRevoked: true,
        signatories: true,
      },
    });
    if (!cert) throw AppError.notFound("Certificate not found");
    return jsonSuccess(
      {
        ...cert,
        type: cert.tournamentId ? "TOURNAMENT" : "REGISTRATION",
        downloadUrl: cert.isRevoked ? null : `/api/certificates/${cert.id}/pdf`,
      },
      requestId
    );
  },
  { module: "account-certificates", rateLimit: { limit: 60, windowMs: 60000 } }
);
