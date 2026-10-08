import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";
import { createAuditLog } from "@/services/audit/audit-service";
import { issueTournamentCertificates } from "@/services/certificates/tournament-certificates.service";
import { certificateEntrySchema } from "@/modules/certificates/certificate-entry.schema";

const issueSchema = z.object({
  entries: z.array(certificateEntrySchema).min(1).max(100),
});

/**
 * Issues template certificates for registered players (one or many).
 * Authorisation: certificates:issue + the tournament inside the caller's
 * scope (district admin → own district's tournaments, state admin → own
 * state, Super Admin → all). Every certificate is its own transaction; the
 * response lists which were issued and which failed (and why).
 */
export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CERTIFICATES_ISSUE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Tournament ID is required");

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true, name: true, stateId: true, districtId: true },
    });
    if (!tournament) throw AppError.notFound("Tournament not found");
    assertInScope(user, tournament, "Tournament not found");

    const { entries } = issueSchema.parse(await request.json());
    const result = await issueTournamentCertificates(id, entries, user.id);

    for (const cert of result.issued) {
      await createAuditLog({
        userId: user.id,
        action: "CREATE",
        module: "certificates",
        entityType: "PlayerCertificate",
        entityId: cert.id,
        details: {
          event: "TOURNAMENT_CERTIFICATE_ISSUED",
          certificateNumber: cert.certificateNumber,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          playerId: cert.playerId,
          stateId: tournament.stateId,
          districtId: tournament.districtId,
        },
      });
    }

    return jsonSuccess(
      {
        issued: result.issued.map((c) => ({ ...c, pdfUrl: `/api/certificates/${c.id}/pdf` })),
        failed: result.failed,
      },
      requestId,
      `${result.issued.length} certificate(s) issued${result.failed.length ? `, ${result.failed.length} not issued` : ""}`
    );
  },
  { module: "admin-tournament-certificates", requireCsrf: true, rateLimit: { limit: 30, windowMs: 60000 } }
);
