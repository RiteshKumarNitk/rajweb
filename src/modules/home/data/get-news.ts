import { unstable_cache } from "next/cache";
import { isStaticSiteRelease } from "@/shared/lib/static-release";

export type HomeNewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: Date | null;
};

const fallbackNews: HomeNewsItem[] = [
  {
    id: "1",
    title: "RRA Formed and Affiliated with IRA",
    slug: "rra-formed-affiliated-ira",
    excerpt:
      "Rajasthan Racquetball Association receives official affiliation from Indian Racquetball Association.",
    category: "Announcement",
    publishedAt: new Date("2025-01-15"),
  },
  {
    id: "2",
    title: "State Championship 2025 Announced",
    slug: "state-championship-2025",
    excerpt: "RRA announces the inaugural Rajasthan State Racquetball Championship.",
    category: "Tournament",
    publishedAt: new Date("2025-02-01"),
  },
  {
    id: "3",
    title: "Player Registration Portal Now Open",
    slug: "player-registration-open",
    excerpt: "Register as an official RRA player through our online portal.",
    category: "Registration",
    publishedAt: new Date("2025-02-15"),
  },
];

async function fetchNewsFromDb(): Promise<HomeNewsItem[]> {
  if (!process.env.DATABASE_URL) return fallbackNews;
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const results = await prisma.news.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        publishedAt: true,
      },
    });
    return results.length > 0 ? results : fallbackNews;
  } catch {
    return fallbackNews;
  }
}

const getCachedNews = unstable_cache(fetchNewsFromDb, ["home-news"], {
  revalidate: 3600,
  tags: ["news"],
});

/** Static release: instant data, no database round-trip. */
export function getHomeNewsSync(): HomeNewsItem[] {
  return fallbackNews;
}

export async function getHomeNews(): Promise<HomeNewsItem[]> {
  if (isStaticSiteRelease() || !process.env.DATABASE_URL) {
    return fallbackNews;
  }
  return getCachedNews();
}
