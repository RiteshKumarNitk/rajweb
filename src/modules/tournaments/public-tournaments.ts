import { cache } from "react";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import prisma from "@/infrastructure/database/prisma";
import { PUBLIC_TOURNAMENT_STATUSES } from "@/modules/tournaments/tournament-dates";

const publishedStatus = { in: [...PUBLIC_TOURNAMENT_STATUSES] };

/** Clears the public tournament list and every public detail page. */
export function revalidatePublicTournaments() {
  revalidateTag("public-tournaments", { expire: 0 });
  revalidatePath("/tournaments");
  revalidatePath("/tournaments/[slug]", "page");
}

async function loadPublishedTournaments() {
  return prisma.tournament.findMany({
    where: { status: publishedStatus },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      venue: true,
      city: true,
      banner: true,
      district: { select: { name: true } },
      registrationCategories: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, type: true, fee: true },
      },
    },
    orderBy: { startDate: "asc" },
  });
}

const getCachedPublishedTournaments = unstable_cache(loadPublishedTournaments, ["public-tournaments-list"], {
  revalidate: 60,
  tags: ["public-tournaments"],
});

export function getPublishedTournaments() {
  return getCachedPublishedTournaments();
}

async function loadPublicTournamentBySlug(slug: string) {
  return prisma.tournament.findFirst({
    where: { slug, status: publishedStatus },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      registrationStart: true,
      registrationDeadline: true,
      venue: true,
      city: true,
      banner: true,
      requiresApprovedPlayer: true,
      maxParticipants: true,
      district: { select: { name: true } },
      registrationCategories: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, type: true, fee: true },
      },
    },
  });
}

const getCachedPublicTournamentBySlug = unstable_cache(loadPublicTournamentBySlug, ["public-tournament"], {
  revalidate: 60,
  tags: ["public-tournaments"],
});

export const getPublicTournamentBySlug = cache(async (slug: string) => getCachedPublicTournamentBySlug(slug));
