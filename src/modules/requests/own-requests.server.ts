import prisma from "@/infrastructure/database/prisma";
import type { RequestRow } from "@/shared/components/requests/requests-panel";

/**
 * Request rows for the signed-in member's own pages. Always filtered by the
 * session user's id (plus, optionally, one of their Player/Coach records), so
 * a page can never list someone else's requests.
 */
export async function getOwnRequestRows(userId: string, where: { playerId?: string; coachId?: string } = {}): Promise<RequestRow[]> {
  const rows = await prisma.request.findMany({
    where: { userId, ...where },
    select: {
      id: true,
      requestNumber: true,
      type: true,
      status: true,
      reason: true,
      requestedValue: true,
      requestedField: true,
      currentValue: true,
      requestedMobile: true,
      requestedEmail: true,
      requestedAddress: true,
      requestedDistrict: { select: { name: true } },
      adminRemarks: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      playerId: true,
      coachId: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    type: r.type,
    status: r.status,
    reason: r.reason,
    requestedValue: r.requestedValue,
    requestedField: r.requestedField,
    currentValue: r.currentValue,
    requestedMobile: r.requestedMobile,
    requestedEmail: r.requestedEmail,
    requestedAddress: r.requestedAddress,
    requestedDistrict: r.requestedDistrict?.name ?? null,
    adminRemarks: r.adminRemarks,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    profileLabel: r.playerId ? "Player" : r.coachId ? "Coach" : undefined,
  }));
}
