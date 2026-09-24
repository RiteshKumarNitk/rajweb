import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { getPublicTournamentBySlug } from "@/modules/tournaments/public-tournaments";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  return {
    title: tournament?.name ?? "Tournament",
    description: tournament?.description ?? "Rajasthan Racquetball Association tournament",
  };
}

export default async function PublicTournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) notFound();

  const registerHref = `/account/tournaments/${tournament.id}`;
  const place = [tournament.venue, tournament.city, tournament.district?.name ?? "State-wide"].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title={tournament.name}
        description={tournament.description ?? "Rajasthan Racquetball Association tournament"}
      />
      <PageContent>
        <Link href="/tournaments" className="mb-6 inline-block text-sm text-slate-500 hover:text-primary">
          Back to tournaments
        </Link>
        <div className="max-w-3xl space-y-6">
          <p className="inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-primary">
            {formatTournamentStatus(tournament.status)}
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-accent" />
            {formatTournamentSchedule(tournament.startDate)} – {formatTournamentSchedule(tournament.endDate)}
          </div>
          {(tournament.registrationStart || tournament.registrationDeadline) && (
            <p className="text-sm text-slate-600">
              Registration: {tournament.registrationStart ? formatTournamentSchedule(tournament.registrationStart) : "Not set"}
              {" – "}
              {tournament.registrationDeadline ? formatTournamentSchedule(tournament.registrationDeadline) : "Not set"}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-accent" />
            {place}
          </div>
          <p className="text-sm text-slate-600">
            {tournament.requiresApprovedPlayer
              ? "Eligibility: approved player registration required."
              : "Eligibility: a player profile is required."}
          </p>
          <p className="text-sm text-slate-600">
            Capacity: {tournament.maxParticipants != null ? `${tournament.maxParticipants} participants` : "No participant limit set"}
          </p>
          {tournament.registrationCategories.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Registration categories</p>
              <div className="flex flex-wrap gap-2">
                {tournament.registrationCategories.map((category) => (
                  <span key={category.id} className="rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                    {category.name} ({category.type === "SINGLES" ? "Singles" : "Doubles"}): {formatInr(category.fee)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {tournament.status === "REGISTRATION_OPEN" && (
            <Link href={registerHref} className="inline-flex text-sm font-semibold text-secondary hover:underline">
              Register
            </Link>
          )}
          {tournament.banner && (
            <a
              href={tournament.banner}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-medium text-secondary hover:underline"
            >
              View poster
            </a>
          )}
        </div>
      </PageContent>
    </>
  );
}
