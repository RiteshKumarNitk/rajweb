import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { Users, UserCheck, Clock, Award, ShieldAlert, Sparkles, Filter } from "lucide-react";
import { PlayersTable, type PlayerRow } from "./players-table";

export const dynamic = "force-dynamic";

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
      take: 200,
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
  const { districtId, user } = await requireAdminScope(PERMISSIONS.PLAYERS_READ);
  const players = await getPlayers(districtId);

  const totalPlayers = players.length;
  const approvedPlayers = players.filter((p) => p.status === "APPROVED").length;
  const pendingPlayers = players.filter((p) => p.status === "PENDING").length;
  const certifiedPlayers = players.filter((p) => p.certificate !== null).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Player Registry</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {districtId ? "District Scoped" : "Federation Wide"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Manage registered racquetball athletes, review licensing applications, and issue digital certificates.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Athletes</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalPlayers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Enrolled in RRA registry</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Approved Players</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{approvedPlayers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">Eligible for tournaments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Pending Review</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingPlayers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-amber-600 font-medium">Awaiting admin review</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Certified Players</p>
                <h3 className="text-2xl font-bold text-primary mt-1">{certifiedPlayers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">QR Credentials generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Players Main Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-primary">All Registered Players</CardTitle>
              <CardDescription className="text-xs">
                Inspect player records, approve pending registrations, and issue official state player credentials.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <PlayersTable players={players} />
        </CardContent>
      </Card>
    </div>
  );
}
