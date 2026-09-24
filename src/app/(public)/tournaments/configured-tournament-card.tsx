import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";

export interface PublicTournamentCardData {
  slug: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
  venue: string | null;
  city: string | null;
  districtName: string | null;
  banner: string | null;
  categories: { id: string; name: string; type: string; fee: number }[];
}

export function ConfiguredTournamentCard({ tournament }: { tournament: PublicTournamentCardData }) {
  const place = [tournament.venue, tournament.city, tournament.districtName ?? "State-wide"].filter(Boolean).join(" · ");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-xl leading-snug">{tournament.name}</CardTitle>
          <span className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-primary">
            {formatTournamentStatus(tournament.status)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4 shrink-0 text-accent" />
          {formatTournamentSchedule(tournament.startDate)} – {formatTournamentSchedule(tournament.endDate)}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 shrink-0 text-accent" />
          {place}
        </div>
        {tournament.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tournament.categories.map((category) => (
              <span key={category.id} className="rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                {category.name}: {formatInr(category.fee)}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href={`/tournaments/${tournament.slug}`} className="text-sm font-medium text-secondary hover:underline">
            View details
          </Link>
          {tournament.banner && (
            <a href={tournament.banner} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
              Poster
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
