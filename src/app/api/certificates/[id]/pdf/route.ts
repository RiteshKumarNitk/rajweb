import { NextResponse } from "next/server";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { hasPermission, PERMISSIONS } from "@/security/rbac/permissions";
import { getOrgScope, isInScope } from "@/security/rbac/org-scope";
import { getPlayerCertificatePdf } from "@/services/certificates/certificate-service";

/**
 * Downloads an issued player certificate PDF (read-only — there is no way to
 * change a certificate here). Allowed for the player it belongs to (resolved
 * from the session: user → player → certificate) and for admins with
 * `certificates:read` whose scope covers it (a tournament certificate belongs
 * to the tournament's state/district, a registration certificate to the
 * player's district). Everyone else gets 404 — no existence oracle.
 */
export const GET = withApiHandler(
  async (_request, { params }) => {
    const user = await requireAuth();
    const id = String(params?.id ?? "");
    if (!/^[a-z0-9]{10,40}$/i.test(id)) throw AppError.notFound("Certificate not found");

    const cert = await prisma.playerCertificate.findUnique({
      where: { id },
      select: {
        id: true,
        isRevoked: true,
        player: { select: { userId: true, districtId: true, district: { select: { stateId: true } } } },
        tournament: { select: { stateId: true, districtId: true } },
      },
    });
    if (!cert) throw AppError.notFound("Certificate not found");

    const isOwner = Boolean(cert.player.userId) && cert.player.userId === user.id;
    if (!isOwner) {
      const owner = cert.tournament ?? { districtId: cert.player.districtId, stateId: cert.player.district.stateId };
      if (!hasPermission(user, PERMISSIONS.CERTIFICATES_READ) || !isInScope(getOrgScope(user), owner)) {
        throw AppError.notFound("Certificate not found");
      }
    } else if (cert.isRevoked) {
      throw AppError.conflict("This certificate has been revoked and can no longer be downloaded.");
    }

    const pdf = await getPlayerCertificatePdf(cert.id);
    return new NextResponse(new Uint8Array(pdf.data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.fileName.replace(/[^\w.-]+/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
  { module: "certificate-pdf", rateLimit: { limit: 30, windowMs: 60000 } }
);
