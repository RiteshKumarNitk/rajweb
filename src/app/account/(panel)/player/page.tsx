import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Trophy, FileText, History } from "lucide-react";
import { getApplicationHistory } from "@/modules/applications/application-history.server";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { PlayerRegistrationFlow } from "./player-registration-flow";
import { PlayerResubmitActions } from "./player-resubmit-actions";
import { RequestsPanel, type RequestRow } from "@/shared/components/requests/requests-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Player Registration",
  description: "Register as a player or view your player registration status.",
};

export default async function AccountPlayerPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [user, player] = await Promise.all([
    prisma.user.findUnique({ where: { id: authUser.id }, select: { name: true, email: true, phone: true } }),
    prisma.player.findUnique({
      where: { userId: authUser.id },
      include: {
        district: true,
        certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" }, take: 1 },
        tournamentRegistrations: { include: { tournament: true }, orderBy: { registeredAt: "desc" } },
      },
    }),
  ]);
  if (!user) redirect("/account/login");

  if (player) {
    const certificate = player.certificates[0];
    const storage = getStorage();
    const history = await getApplicationHistory("players", player.id, player.createdAt);
    const requests =
      player.status === "APPROVED"
        ? await prisma.request.findMany({
            where: { playerId: player.id },
            include: { requestedDistrict: true },
            orderBy: { createdAt: "desc" },
          })
        : [];
    const requestRows: RequestRow[] = requests.map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      type: r.type,
      status: r.status,
      reason: r.reason,
      requestedValue: r.requestedValue,
      requestedMobile: r.requestedMobile,
      requestedEmail: r.requestedEmail,
      requestedAddress: r.requestedAddress,
      requestedDistrict: r.requestedDistrict?.name ?? null,
      adminRemarks: r.adminRemarks,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    }));

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Player Workspace</h1>
          <p className="text-slate-500">Your player registration and everything tied to it.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{player.name}</CardTitle>
              <StatusBadge status={player.status} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-slate-500">Player ID:</span> <span className="font-medium">{player.playerId}</span></p>
              <p><span className="text-slate-500">District:</span> <span className="font-medium">{player.district.name}</span></p>
              {player.category && (
                <p><span className="text-slate-500">Playing Category:</span> <span className="font-medium">{player.category}</span></p>
              )}
              <p><span className="text-slate-500">Application Date:</span> <span className="font-medium">{formatDate(player.createdAt)}</span></p>
              {player.approvedAt && (
                <p><span className="text-slate-500">Approval Date:</span> <span className="font-medium">{formatDate(player.approvedAt)}</span></p>
              )}
              {player.status === "REJECTED" && (
                <PlayerResubmitActions
                  reason={player.rejectionReason}
                  prefill={{ name: user.name, email: user.email, phone: user.phone ?? "" }}
                  resubmit={{
                    id: player.id,
                    dateOfBirth: player.dateOfBirth.toISOString().slice(0, 10),
                    gender: player.gender,
                    district: player.district.name,
                    category: player.category ?? "",
                  }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-accent" /> Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {certificate ? (
                <>
                  <p className="font-medium text-primary">{certificate.certificateNumber}</p>
                  <p className="text-xs text-slate-400">Issued {formatDate(certificate.issuedAt)}</p>
                  {certificate.pdfPath && (
                    <a
                      href={storage.getUrl(certificate.pdfPath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-secondary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> View Document
                    </a>
                  )}
                </>
              ) : player.status === "APPROVED" ? (
                <p className="text-slate-500">Approved — certificate not yet issued.</p>
              ) : (
                <p className="text-slate-500">Available once your registration is approved.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-accent" /> Tournament Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {player.tournamentRegistrations.length === 0 ? (
              <p className="text-sm text-slate-500">
                No tournament registrations yet.{" "}
                <Link href="/account/tournaments" className="text-secondary hover:underline">Browse tournaments</Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {player.tournamentRegistrations.map((reg) => (
                  <li key={reg.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                    <span className="text-sm font-medium text-primary">{reg.tournament.name}</span>
                    <StatusBadge status={reg.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-accent" /> Application History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {history.map((entry, i) => (
                <li key={entry.id} className={`flex items-center justify-between ${i < history.length - 1 ? "border-b border-slate-100 pb-2" : ""}`}>
                  <span className="text-slate-700">
                    {entry.label}
                    {entry.detail ? ` — ${entry.detail}` : ""}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {player.status === "APPROVED" && (
          <RequestsPanel
            profileType="player"
            current={{ email: player.email, mobile: player.mobile, district: player.district.name }}
            requests={requestRows}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Player Registration</h1>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <PlayerRegistrationFlow prefill={{ name: user.name, email: user.email, phone: user.phone ?? "" }} />
        </CardContent>
      </Card>
    </div>
  );
}
