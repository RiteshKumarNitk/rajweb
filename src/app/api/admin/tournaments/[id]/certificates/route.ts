import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";
import { createAuditLog } from "@/services/audit/audit-service";
import { issueTournamentCertificates } from "@/services/certificates/certificate-service";

const issueSchema = z.object({
  entries: z
    .array(
      z.object({
        playerId: z.string().min(1),
        position: z.union([z.string().trim().max(120), z.literal(""), z.null()]).optional(),
      })
    )
    .min(1)
    .max(200),
});

/**
 * Generates tournament certificates for registered players. Authorisation:
 * certificates:issue + the tournament inside the caller's scope (a district
 * admin only for their own district's tournaments, a state admin within
 * their state, Super Admin anywhere). Tournament/eligibility rules live in
 * issueTournamentCertificates().
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
        skipped: result.skipped,
      },
      requestId,
      `${result.issued.length} certificate(s) issued${result.skipped.length ? `, ${result.skipped.length} skipped` : ""}`
    );
  },
  { module: "admin-tournament-certificates", requireCsrf: true, rateLimit: { limit: 20, windowMs: 60000 } }
);
