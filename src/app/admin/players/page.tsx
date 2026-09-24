import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { PlayersTable, type PlayerRow } from "./players-table";

async function getPlayers(districtId?: string): Promise<PlayerRow[]> {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const storage = getStorage();
    const rows = await prisma.player.findMany({
      where: districtId ? { districtId } : undefined,
      include: {
        district: true,
        certificates: {
          where: { isRevoked: false },
          orderBy: { issuedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return rows.map((player) => {
      const cert = player.certificates[0];
      return {
        id: player.id,
        playerId: player.playerId,
        name: player.name,
        email: player.email,
        district: player.district.name,
        status: player.status,
        certificate: cert
          ? {
              certificateNumber: cert.certificateNumber,
              qrCode: cert.qrCode,
              issuedAt: cert.issuedAt.toISOString(),
              expiresAt: cert.expiresAt?.toISOString() ?? null,
              pdfUrl: cert.pdfPath ? storage.getUrl(cert.pdfPath) : undefined,
            }
          : null,
      };
    });
  } catch {
    return [];
  }
}

export default async function AdminPlayersPage() {
  const { districtId } = await requireAdminScope(PERMISSIONS.PLAYERS_READ);
  const players = await getPlayers(districtId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Players</h1>
          <p className="text-slate-500">
            {players.length} registered players{districtId ? " (your district)" : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
        </CardHeader>
        <CardContent>
          <PlayersTable players={players} />
        </CardContent>
      </Card>
    </div>
  );
}
