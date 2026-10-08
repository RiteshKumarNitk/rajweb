import { NextResponse } from "next/server";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";
import { certificateEntrySchema } from "@/modules/certificates/certificate-entry.schema";
import { previewTournamentCertificate } from "@/services/certificates/tournament-certificates.service";

/**
 * Preview of one player's certificate with the tournament's real data, its
 * template and signatories, and the number the next certificate would get.
 * Nothing is saved or reserved; the PDF is stamped "PREVIEW · NOT ISSUED".
 * Same authorisation as issuing.
 */
export const POST = withApiHandler(
  async (request, { params }) => {
    const user = await requirePermission(PERMISSIONS.CERTIFICATES_ISSUE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Tournament ID is required");

    const tournament = await prisma.tournament.findUnique({ where: { id }, select: { stateId: true, districtId: true } });
    if (!tournament) throw AppError.notFound("Tournament not found");
    assertInScope(user, tournament, "Tournament not found");

    const entry = certificateEntrySchema.parse(await request.json());
    const pdf = await previewTournamentCertificate(id, entry);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="certificate-preview.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
  { module: "admin-tournament-certificates", requireCsrf: true, rateLimit: { limit: 60, windowMs: 60000 } }
);
