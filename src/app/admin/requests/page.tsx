import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { RequestsTable, type AdminRequestRow } from "./requests-table";

export default async function AdminRequestsPage() {
  const { districtId } = await requireAdminScope(PERMISSIONS.REQUESTS_VIEW);

  const requests = await prisma.request.findMany({
    where: districtId
      ? { OR: [{ player: { districtId } }, { coach: { districtId } }] }
      : undefined,
    include: {
      user: { select: { name: true, email: true } },
      player: { include: { district: true } },
      coach: { include: { district: true } },
      requestedDistrict: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows: AdminRequestRow[] = requests.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    userName: r.user.name,
    userEmail: r.user.email,
    profileType: r.playerId ? "player" : "coach",
    type: r.type,
    status: r.status,
    district: (r.player?.district ?? r.coach?.district)?.name ?? "—",
    requestedDistrict: r.requestedDistrict?.name ?? null,
    submittedAt: r.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Request Center</h1>
        <p className="text-slate-500">
          Player and Coach service requests — district changes, contact updates, certificates, and corrections
          {districtId ? " (your district)" : ""}.
        </p>
      </div>

      <RequestsTable requests={rows} />
    </div>
  );
}
