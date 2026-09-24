import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { getDistrictWhereClause, isFederationWide } from "@/security/rbac/district-scope";
import { hasPermission, PERMISSIONS } from "@/security/rbac/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule, formatTournamentStatus, toDatetimeLocalValue } from "@/modules/tournaments/tournament-dates";
import { TournamentEditForm } from "./tournament-edit-form";
import { CategoriesManager } from "./categories-manager";

export default async function AdminTournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!hasPermission(user, PERMISSIONS.TOURNAMENTS_READ)) {
    redirect("/admin?error=forbidden");
  }

  const districtWhere = getDistrictWhereClause(user);
  const [tournament, districts] = await Promise.all([
    prisma.tournament.findFirst({
      where: { id, ...districtWhere },
      include: {
        district: true,
        registrationCategories: { orderBy: { createdAt: "asc" } },
        registrations: {
          orderBy: { registeredAt: "desc" },
          include: {
            player: { select: { name: true, playerId: true } },
            category: { select: { name: true } },
          },
        },
        _count: { select: { registrations: true } },
      },
    }),
    prisma.district.findMany({
      where: isFederationWide(user) ? undefined : { id: user.districtId ?? undefined },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!tournament) notFound();

  const canManage = hasPermission(user, PERMISSIONS.TOURNAMENTS_MANAGE);

  return (
    <div>
      <Link href="/admin/tournaments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Tournaments
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Trophy className="h-6 w-6 text-accent" /> {tournament.name}
          </h1>
          <p className="font-mono text-sm text-slate-500">{tournament.slug}</p>
        </div>
        <StatusBadge status={tournament.status} label={formatTournamentStatus(tournament.status)} className="text-sm" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Event Dates</p>
            <p className="font-medium text-primary">{formatTournamentSchedule(tournament.startDate)} – {formatTournamentSchedule(tournament.endDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Registration Window</p>
            <p className="font-medium text-primary">
              {tournament.registrationStart ? formatTournamentSchedule(tournament.registrationStart) : "Not set"}
              {" – "}
              {tournament.registrationDeadline ? formatTournamentSchedule(tournament.registrationDeadline) : "Not set"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Venue / District</p>
            <p className="font-medium text-primary">{tournament.venue ?? "TBA"} · {tournament.city ? `${tournament.city}, ` : ""}{tournament.district?.name ?? "State-wide"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Capacity / Registrations</p>
            <p className="font-medium text-primary">
              {tournament._count.registrations}
              {tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ""}
            </p>
            <p className="text-xs text-slate-400">{tournament.registrationCategories.filter((c) => c.isActive).length} active categories</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
          </CardHeader>
          <CardContent>
            <TournamentEditForm
              tournament={{
                id: tournament.id,
                name: tournament.name,
                description: tournament.description,
                category: tournament.category,
                status: tournament.status,
                districtId: tournament.districtId,
                venue: tournament.venue,
                city: tournament.city,
                startDate: toDatetimeLocalValue(tournament.startDate),
                endDate: toDatetimeLocalValue(tournament.endDate),
                registrationStart: tournament.registrationStart ? toDatetimeLocalValue(tournament.registrationStart) : null,
                registrationDeadline: tournament.registrationDeadline ? toDatetimeLocalValue(tournament.registrationDeadline) : null,
                maxParticipants: tournament.maxParticipants,
                banner: tournament.banner,
                contactName: tournament.contactName,
                contactPhone: tournament.contactPhone,
                contactEmail: tournament.contactEmail,
                requiresApprovedPlayer: tournament.requiresApprovedPlayer,
              }}
              districts={districts}
              lockedDistrictId={!isFederationWide(user) ? (user.districtId ?? undefined) : undefined}
              readOnly={!canManage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration Categories &amp; Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoriesManager
              tournamentId={tournament.id}
              categories={tournament.registrationCategories.map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                fee: c.fee,
                isActive: c.isActive,
              }))}
              readOnly={!canManage}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.registrations.length === 0 ? (
            <p className="text-sm text-slate-500">No registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Player</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.registrations.map((registration) => (
                    <tr key={registration.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4">
                        <p className="font-medium text-primary">{registration.player.name}</p>
                        <p className="font-mono text-xs text-slate-400">{registration.player.playerId}</p>
                      </td>
                      <td className="py-2 pr-4">{registration.category?.name ?? "—"}</td>
                      <td className="py-2 pr-4">{registration.amount != null ? formatInr(registration.amount) : "—"}</td>
                      <td className="py-2 pr-4">{registration.status}</td>
                      <td className="py-2">{formatTournamentSchedule(registration.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
