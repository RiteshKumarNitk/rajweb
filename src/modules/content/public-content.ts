import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import prisma from "@/infrastructure/database/prisma";

/**
 * Cached public reads for database-driven website content (committee, stats,
 * timeline, news, partner groups). Every admin write calls
 * revalidateWebsiteContent() so public pages update immediately — the same
 * pattern as public tournaments and gallery.
 */
export function revalidateWebsiteContent() {
  revalidateTag("public-content", { expire: 0 });
  revalidatePath("/", "layout");
  revalidatePath("/about/executive-committee");
  revalidatePath("/about/history");
  revalidatePath("/media/news");
}

export interface PublicCommitteeMember {
  id: string;
  name: string;
  designation: string;
  photo: string | null;
  bio: string | null;
  positions: { role: string; organization: string }[] | null;
  badge: string | null;
}

async function loadCommittee(): Promise<PublicCommitteeMember[]> {
  const rows = await prisma.executiveMember.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      designation: true,
      photo: true,
      bio: true,
      positions: true,
      badge: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    designation: row.designation,
    photo: row.photo,
    bio: row.bio,
    positions: (row.positions as { role: string; organization: string }[] | null) ?? null,
    badge: row.badge,
  }));
}

export interface PublicAchievement {
  id: string;
  label: string;
  value: string;
}

async function loadAchievements(): Promise<PublicAchievement[]> {
  return prisma.achievement.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, label: true, value: true },
  });
}

export interface PublicTimelineItem {
  id: string;
  year: string;
  title: string;
  description: string;
}

async function loadTimeline(): Promise<PublicTimelineItem[]> {
  return prisma.timelineItem.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, year: true, title: true, description: true },
  });
}

export interface PublicNewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: Date | null;
}

async function loadNews(): Promise<PublicNewsItem[]> {
  return prisma.news.findMany({
    where: { isActive: true, isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      category: true,
      publishedAt: true,
    },
  });
}

export interface PublicPartner {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
  role: string | null;
  location: string | null;
  phone: string | null;
  services: string[] | null;
}

async function loadPartners(type: string): Promise<PublicPartner[]> {
  const rows = await prisma.partner.findMany({
    where: { isActive: true, type },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      logo: true,
      website: true,
      role: true,
      location: true,
      phone: true,
      services: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    services: (row.services as string[] | null) ?? null,
  }));
}

const cached = <T>(fn: () => Promise<T>, key: string) =>
  unstable_cache(fn, [key], { revalidate: 60, tags: ["public-content"] });

const getCachedCommittee = cached(loadCommittee, "public-committee");
const getCachedAchievements = cached(loadAchievements, "public-achievements");
const getCachedTimeline = cached(loadTimeline, "public-timeline");
const getCachedNews = cached(loadNews, "public-news");
const cachedPartnerLoaders = new Map<
  string,
  () => Promise<PublicPartner[]>
>();

export function getPublicCommittee() {
  return getCachedCommittee();
}

export function getPublicAchievements() {
  return getCachedAchievements();
}

export function getPublicTimeline() {
  return getCachedTimeline();
}

export function getPublicNews() {
  return getCachedNews();
}

export function getPublicPartners(type: string) {
  let loader = cachedPartnerLoaders.get(type);
  if (!loader) {
    loader = cached(() => loadPartners(type), `public-partners-${type}`);
    cachedPartnerLoaders.set(type, loader);
  }
  return loader();
}
