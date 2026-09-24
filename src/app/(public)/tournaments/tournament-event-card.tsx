"use client";

import { useState } from "react";
import { Calendar, MapPin, Mail, Phone, Globe, ImageIcon, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { MediaImage } from "@/shared/components/ui/media-image";
import {
  siteConfig,
  type TournamentEvent,
  type TournamentEventStatus,
} from "@/shared/config/site";

const statusColors: Record<TournamentEventStatus, string> = {
  Upcoming: "bg-accent/20 text-primary",
  Ongoing: "bg-blue-100 text-blue-800",
  Completed: "bg-slate-100 text-slate-700",
};

export function TournamentEventCard({ tournament }: { tournament: TournamentEvent }) {
  const [showPoster, setShowPoster] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-xl leading-snug">{tournament.title}</CardTitle>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusColors[tournament.status]}`}
          >
            {tournament.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4 shrink-0 text-accent" />
          {tournament.date}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 shrink-0 text-accent" />
          {tournament.venue}, {tournament.location}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Age Group</p>
          <div className="flex flex-wrap gap-2">
            {tournament.ageGroups.map((group) => (
              <span
                key={group}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                {group}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Event</p>
          <div className="flex flex-wrap gap-2">
            {tournament.events.map((event) => (
              <span
                key={event}
                className="rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary"
              >
                {event}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-accent" />
            <a href={`mailto:${siteConfig.email}`} className="hover:text-secondary">
              {siteConfig.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-accent" />
            <a
              href={siteConfig.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-secondary"
            >
              rajasthanracquetball.com
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-accent" />
            <span>99289-62982{/* · 9521940184 */}</span>
          </div>
        </div>

        <Button
          type="button"
          variant={showPoster ? "outline" : "default"}
          className="w-full sm:w-auto"
          onClick={() => setShowPoster((open) => !open)}
        >
          {showPoster ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Hide Event Poster
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              View Event Poster
            </>
          )}
        </Button>

        {showPoster && (
          <div className="pt-2">
            <MediaImage
              src={tournament.poster}
              alt={`${tournament.title} poster`}
              aspect="poster"
              fit="contain"
              containerClassName="bg-white ring-1 ring-slate-200"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
