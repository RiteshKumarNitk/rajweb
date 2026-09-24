import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { TournamentRegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournament registration",
};

export default async function AccountTournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      district: true,
      registrationCategories: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!tournament || tournament.status === "DRAFT" || tournament.status === "CANCELLED") notFound();

  const player = await prisma.player.findUnique({
    where: { userId: authUser.id },
    include: {
      tournamentRegistrations: {
        where: { tournamentId },
        include: { category: true },
      },
    },
  });
  const registration = player?.tournamentRegistrations[0];
  const place = [tournament.venue, tournament.city, tournament.district?.name ?? "State-wide"].filter(Boolean).join(" · ");

  let disabledReason: string | undefined;
  if (!player) {
    disabledReason = "You must register as a player before registering for a tournament.";
  } else if (tournament.requiresApprovedPlayer && player.status !== "APPROVED") {
    disabledReason = "An approved player registration is required for this tournament.";
  } else if (tournament.status !== "REGISTRATION_OPEN") {
    disabledReason = "Registration is not open for this tournament.";
  } else if (tournament.registrationStart && new Date() < tournament.registrationStart) {
    disabledReason = "Registration has not started yet.";
  } else if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
    disabledReason = "Registration is closed.";
  }

  return (
    <div className="space-y-6">
      <Link href="/account/tournaments" className="text-sm text-slate-500 hover:text-primary">
        Back to tournaments
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{tournament.name}</h1>
          <p className="text-sm text-slate-500">{tournament.description}</p>
        </div>
        <StatusBadge status={tournament.status} label={formatTournamentStatus(tournament.status)} />
      </div>

      <Card>
        <CardContent className="space-y-2 pt-6 text-sm text-slate-600">
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            {formatTournamentSchedule(tournament.startDate)} – {formatTournamentSchedule(tournament.endDate)}
          </p>
          <p>
            Registration window: {tournament.registrationStart ? formatTournamentSchedule(tournament.registrationStart) : "Not set"}
            {" – "}
            {tournament.registrationDeadline ? formatTournamentSchedule(tournament.registrationDeadline) : "Not set"}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {place}
          </p>
          <p>{tournament.requiresApprovedPlayer ? "Approved player registration is required." : "A player profile is required."}</p>
          <p>Capacity: {tournament.maxParticipants ?? "No limit set"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{registration ? "Your registration" : "Register"}</CardTitle>
        </CardHeader>
        <CardContent>
          {registration ? (
            <div className="space-y-1.5 text-sm text-slate-600">
              <p className="font-medium text-primary">{tournament.name}</p>
              <p>Category: {registration.category?.name ?? "Category removed"}</p>
              <p>Registration ID: <span className="font-mono text-xs">{registration.id}</span></p>
              <p>Status: {registration.status}</p>
              <p>Registration amount: {registration.amount != null ? formatInr(registration.amount) : "Not recorded"}</p>
              <p>Registered: {formatTournamentSchedule(registration.registeredAt)}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {!player && (
                <Link href="/account/player" className="text-sm font-medium text-secondary hover:underline">
                  Register as a player
                </Link>
              )}
              <TournamentRegisterForm
                tournamentId={tournament.id}
                categories={tournament.registrationCategories.map((category) => ({
                  id: category.id,
                  name: category.name,
                  type: category.type,
                  fee: category.fee,
                }))}
                disabledReason={disabledReason}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
