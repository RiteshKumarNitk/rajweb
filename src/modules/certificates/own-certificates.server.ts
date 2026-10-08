import prisma from "@/infrastructure/database/prisma";
import { getStorage } from "@/infrastructure/storage/storage-adapter";

export interface OwnCertificate {
  id: string;
  kind: "player" | "coach";
  certificateNumber: string;
  /** e.g. "Certificate of Participation" / "Certificate of Registration". */
  title: string;
  /** "Participation" / "1st Place" … for template certificates; else "Tournament Certificate", "Registration Certificate", "Coach Certificate". */
  typeLabel: string;
  tournamentName: string | null;
  tournamentId: string | null;
  position: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  isRevoked: boolean;
  viewUrl: string | null;
  downloadUrl: string | null;
}

/**
 * Certificates issued to the signed-in user — resolved from the session user
 * id (user → player/coach → certificates), never from an id in the request.
 * Only rows that exist are issued certificates (issuing writes them); revoked
 * ones are kept and marked.
 */
export async function getOwnCertificates(userId: string, opts: { kinds?: Array<"player" | "coach"> } = {}): Promise<OwnCertificate[]> {
  const kinds = opts.kinds ?? ["player", "coach"];
  const [player, coach] = await Promise.all([
    kinds.includes("player")
      ? prisma.player.findUnique({
          where: { userId },
          select: {
            certificates: {
              select: {
                id: true,
                certificateNumber: true,
                title: true,
                tournamentId: true,
                eventName: true,
                position: true,
                achievement: true,
                categoryName: true,
                eventLabel: true,
                issuedAt: true,
                expiresAt: true,
                isRevoked: true,
                tournament: { select: { name: true } },
              },
              orderBy: { issuedAt: "desc" },
            },
          },
        })
      : null,
    kinds.includes("coach")
      ? prisma.coach.findUnique({
          where: { userId },
          select: {
            certificates: {
              select: { id: true, certificateNumber: true, issuedAt: true, expiresAt: true, isRevoked: true, pdfPath: true },
              orderBy: { issuedAt: "desc" },
            },
          },
        })
      : null,
  ]);
  const storage = getStorage();
  return [
    ...(player?.certificates ?? []).map((c) => ({
      id: c.id,
      kind: "player" as const,
      certificateNumber: c.certificateNumber,
      // Template certificates: the type IS the achievement; the subtitle is what was ticked.
      title: c.achievement
        ? [c.categoryName, c.eventLabel].filter(Boolean).join(" · ") || "Tournament Certificate"
        : c.title ?? (c.tournamentId ? "Tournament Certificate" : "Certificate of Registration"),
      typeLabel: c.achievement ? c.position ?? "Tournament Certificate" : c.tournamentId ? "Tournament Certificate" : "Registration Certificate",
      tournamentName: c.eventName ?? c.tournament?.name ?? null,
      tournamentId: c.tournamentId,
      position: c.achievement ? null : c.position,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      isRevoked: c.isRevoked,
      viewUrl: `/account/player/certificates/${c.id}`,
      downloadUrl: c.isRevoked ? null : `/api/certificates/${c.id}/pdf`,
    })),
    ...(coach?.certificates ?? []).map((c) => ({
      id: c.id,
      kind: "coach" as const,
      certificateNumber: c.certificateNumber,
      title: "Coach Certificate",
      typeLabel: "Coach Certificate",
      tournamentName: null,
      tournamentId: null,
      position: null,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      isRevoked: c.isRevoked,
      viewUrl: null,
      downloadUrl: !c.isRevoked && c.pdfPath ? storage.getUrl(c.pdfPath) : null,
    })),
  ];
}
