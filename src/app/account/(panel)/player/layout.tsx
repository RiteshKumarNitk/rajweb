import { redirect } from "next/navigation";
import { MapPin, Trophy, Award, ClipboardList, BadgeCheck } from "lucide-react";
import { getCurrentUser } from "@/security/auth/session";
import { getRegistrationChoice } from "@/modules/applications/registration-choice.server";
import { getOwnPlayer, getOwnPlayerCounts } from "@/modules/players/own-player.server";
import { Card, CardContent } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { PlayerTabs } from "./player-tabs";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Returned for correction",
  EXPIRED: "Expired",
};

/**
 * Player area shell. Once the account has a Player record: a summary
 * (status, State, District and real counts) and the Profile / Tournaments /
 * Certificates / Change Requests tabs. Without one — or when the account
 * holds another registration — the page renders alone (application form or
 * locked notice).
 */
export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [registration, player] = await Promise.all([getRegistrationChoice(authUser.id), getOwnPlayer(authUser.id)]);
  if (!player || !registration.allowed.includes("player")) return <>{children}</>;

  const counts = await getOwnPlayerCounts(player.id);
  const stats = [
    { label: "Player Status", value: <StatusBadge status={player.status} label={STATUS_LABELS[player.status] ?? player.status} />, icon: BadgeCheck },
    { label: "State", value: player.district.state?.name ?? "—", icon: MapPin },
    { label: "District", value: player.district.name, icon: MapPin },
    { label: "Tournaments", value: counts.tournaments, icon: Trophy },
    { label: "Certificates", value: counts.certificates, icon: Award },
    { label: "Pending Requests", value: counts.pendingRequests, icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Player</p>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">{player.name}</h1>
        </div>
        <p className="font-mono text-sm font-semibold text-slate-600">Player ID: {player.playerId}</p>
      </div>

      <Card data-testid="player-summary">
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </p>
              <div className="mt-1 truncate text-lg font-bold text-slate-900" data-stat={s.label}>
                {s.value}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <PlayerTabs pendingRequests={counts.pendingRequests} />

      <div>{children}</div>
    </div>
  );
}
