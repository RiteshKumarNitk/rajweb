import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Button } from "@/shared/components/ui/button";
import { tournamentEvents } from "@/shared/config/site";
import { getPublishedTournaments } from "@/modules/tournaments/public-tournaments";
import { TournamentEventCard } from "./tournament-event-card";
import { ConfiguredTournamentCard } from "./configured-tournament-card";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tournaments",
  description:
    "Racquetball Training Camp & State Championship — Rajasthan Racquetball Association, Jaipur, 30 June 2026.",
};

export default async function TournamentsPage() {
  let published: Awaited<ReturnType<typeof getPublishedTournaments>> = [];
  try {
    published = await getPublishedTournaments();
  } catch {
    published = [];
  }

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="Tournaments"
        description="State-level racquetball tournaments and training camps organized by RRA across Rajasthan."
      />
      <PageContent>
        <div className="mb-10 flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/register/player">Register as Player</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Host a Tournament</Link>
          </Button>
        </div>

        {published.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold text-primary">Scheduled Tournaments</h2>
            <div className="grid gap-8 lg:grid-cols-2">
              {published.map((tournament) => (
                <ConfiguredTournamentCard
                  key={tournament.id}
                  tournament={{
                    slug: tournament.slug,
                    name: tournament.name,
                    status: tournament.status,
                    startDate: tournament.startDate,
                    endDate: tournament.endDate,
                    venue: tournament.venue,
                    city: tournament.city,
                    districtName: tournament.district?.name ?? null,
                    banner: tournament.banner,
                    categories: tournament.registrationCategories.map((category) => ({
                      id: category.id,
                      name: category.name,
                      type: category.type,
                      fee: category.fee,
                    })),
                  }}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-6 text-xl font-bold text-primary">Upcoming Events</h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {tournamentEvents.map((tournament) => (
              <TournamentEventCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </section>
      </PageContent>
    </>
  );
}
