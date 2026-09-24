import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { playerCertDistrictWhere, coachCertDistrictWhere } from "@/security/rbac/district-scope";
import { hasPermission } from "@/security/rbac/permissions";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { IssueCertificateButton } from "@/shared/components/admin/issue-certificate-button";

async function getCertificates(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const [playerCerts, coachCerts] = await Promise.all([
      prisma.playerCertificate.findMany({
        where: playerCertDistrictWhere(districtId),
        include: { player: true },
        orderBy: { issuedAt: "desc" },
        take: 50,
      }),
      prisma.coachCertificate.findMany({
        where: coachCertDistrictWhere(districtId),
        include: { coach: true },
        orderBy: { issuedAt: "desc" },
        take: 50,
      }),
    ]);
    return { playerCerts, coachCerts };
  } catch {
    return { playerCerts: [], coachCerts: [] };
  }
}

async function getEligiblePlayers(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const players = await prisma.player.findMany({
      where: {
        status: "APPROVED",
        ...(districtId ? { districtId } : {}),
        certificates: { none: { isRevoked: false } },
      },
      include: { district: true },
      orderBy: { name: "asc" },
    });
    return players.map((p) => ({
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      email: p.email,
      district: p.district.name,
    }));
  } catch {
    return [];
  }
}

import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";

type PlayerCertWithPlayer = Awaited<ReturnType<typeof getCertificates>>["playerCerts"][number];
type CoachCertWithCoach = Awaited<ReturnType<typeof getCertificates>>["coachCerts"][number];

export default async function AdminCertificatesPage() {
  const { districtId, user } = await requireAdminScope(PERMISSIONS.CERTIFICATES_READ);
  const [{ playerCerts, coachCerts }, eligiblePlayers] = await Promise.all([
    getCertificates(districtId),
    getEligiblePlayers(districtId),
  ]);
  const storage = getStorage();
  const canIssue = hasPermission(user, PERMISSIONS.CERTIFICATES_ISSUE);

  const playerColumns: ColumnDef<PlayerCertWithPlayer>[] = [
    { header: "Cert No.", accessorKey: "certificateNumber", className: "font-mono text-xs" },
    { header: "Player", cell: (c) => c.player.name },
    { header: "Issued", cell: (c) => formatDate(c.issuedAt) },
    {
      header: "PDF",
      cell: (c) =>
        c.pdfPath ? (
          <a href={storage.getUrl(c.pdfPath)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            View
          </a>
        ) : (
          <a
            href={`/verify?certificateNumber=${encodeURIComponent(c.certificateNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Verify
          </a>
        ),
    },
  ];

  const coachColumns: ColumnDef<CoachCertWithCoach>[] = [
    { header: "Cert No.", accessorKey: "certificateNumber", className: "font-mono text-xs" },
    { header: "Coach", cell: (c) => c.coach.name },
    { header: "Issued", cell: (c) => formatDate(c.issuedAt) },
    {
      header: "PDF",
      cell: (c) =>
        c.pdfPath ? (
          <a href={storage.getUrl(c.pdfPath)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            View
          </a>
        ) : (
          <a
            href={`/verify?certificateNumber=${encodeURIComponent(c.certificateNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Verify
          </a>
        ),
    },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Certificates</h1>
          <p className="text-slate-500">Issued player and coach certificates</p>
        </div>
        {canIssue && <IssueCertificateButton players={eligiblePlayers} label="Issue Certificate" />}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title={`Player Certificates (${playerCerts.length})`}>
          <DataTable
            data={playerCerts}
            columns={playerColumns}
            keyExtractor={(c) => c.id}
            emptyTitle="No player certificates issued yet"
          />
        </DashboardCard>
        <DashboardCard title={`Coach Certificates (${coachCerts.length})`}>
          <DataTable
            data={coachCerts}
            columns={coachColumns}
            keyExtractor={(c) => c.id}
            emptyTitle="No coach certificates issued yet"
          />
        </DashboardCard>
      </div>
    </div>
  );
}
