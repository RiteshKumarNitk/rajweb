/** What a player certificate is and whether it is currently valid — from stored data only. */
export function certificateKind(c: { tournamentId: string | null }): string {
  return c.tournamentId ? "Tournament Certificate" : "Registration Certificate";
}

export function certificateTitle(c: { tournamentId: string | null; title: string | null }): string {
  return c.title ?? (c.tournamentId ? "Tournament Certificate" : "Certificate of Registration");
}

export function certificateStatus(c: { isRevoked: boolean; expiresAt: Date | null }): { status: string; label: string } {
  if (c.isRevoked) return { status: "REJECTED", label: "Revoked" };
  if (c.expiresAt && c.expiresAt < new Date()) return { status: "EXPIRED", label: "Expired" };
  return { status: "APPROVED", label: "Valid" };
}
