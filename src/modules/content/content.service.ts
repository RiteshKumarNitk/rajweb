import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { slugify } from "@/lib/utils";

/** Site-local image path or any https(s) URL — photos/logos are path/URL data, never fetched server-side. */
const imageRefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v.startsWith("/images/") || /^https?:\/\//i.test(v),
    "Image must be a /images/... site path or an http(s) URL"
  );

const externalUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => /^https?:\/\//i.test(v), "Must be a valid http(s) URL")
  .nullable()
  .optional();

const positionsSchema = z
  .array(z.object({ role: z.string().trim().min(1).max(120), organization: z.string().trim().min(1).max(160) }))
  .max(6)
  .nullable()
  .optional();

/* ── Executive committee ─────────────────────────────────────── */

export const committeeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  designation: z.string().trim().min(2).max(160),
  photo: imageRefSchema.nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  positions: positionsSchema,
  badge: z.string().trim().max(60).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export const committeeUpdateSchema = committeeSchema.partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

export type CommitteeInput = z.infer<typeof committeeSchema>;
export type CommitteeUpdate = z.infer<typeof committeeUpdateSchema>;

export async function createCommitteeMember(input: CommitteeInput) {
  return prisma.executiveMember.create({
    data: {
      name: input.name,
      designation: input.designation,
      photo: input.photo ?? null,
      bio: input.bio ?? null,
      positions: input.positions ?? undefined,
      badge: input.badge ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
}

export async function updateCommitteeMember(id: string, input: CommitteeUpdate) {
  const data: Record<string, unknown> = {};
  for (const key of ["name", "designation", "photo", "bio", "positions", "badge", "email", "phone", "sortOrder", "isActive"] as const) {
    if (input[key] !== undefined) data[key] = input[key] ?? null;
  }
  return prisma.executiveMember.update({ where: { id }, data });
}

/* ── Achievements (home stats bar) ───────────────────────────── */

export const achievementSchema = z.object({
  label: z.string().trim().min(2).max(80),
  value: z.string().trim().min(1).max(20),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export const achievementUpdateSchema = achievementSchema.partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

export type AchievementInput = z.infer<typeof achievementSchema>;

export async function createAchievement(input: AchievementInput) {
  return prisma.achievement.create({ data: input });
}

export async function updateAchievement(id: string, input: z.infer<typeof achievementUpdateSchema>) {
  const { label, value, sortOrder, isActive } = input;
  return prisma.achievement.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(value !== undefined && { value }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  });
}

/* ── Timeline (history milestones) ───────────────────────────── */

export const timelineSchema = z.object({
  year: z.string().trim().min(2).max(10),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(500),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export const timelineUpdateSchema = timelineSchema.partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

export type TimelineInput = z.infer<typeof timelineSchema>;

export async function createTimelineItem(input: TimelineInput) {
  return prisma.timelineItem.create({ data: input });
}

export async function updateTimelineItem(id: string, input: z.infer<typeof timelineUpdateSchema>) {
  const { year, title, description, sortOrder, isActive } = input;
  return prisma.timelineItem.update({
    where: { id },
    data: {
      ...(year !== undefined && { year }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  });
}

/* ── News (public newsfeed + home Latest News) ───────────────── */

export const newsSchema = z.object({
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().trim().max(500).nullable().optional(),
  content: z.string().trim().min(2).max(10000),
  category: z.string().trim().min(1).max(60).nullable().optional(),
  author: z.string().trim().max(100).nullable().optional(),
  isActive: z.boolean().default(true),
  isPublished: z.boolean().default(true),
});

export const newsUpdateSchema = newsSchema.partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

export type NewsInput = z.infer<typeof newsSchema>;

async function uniqueNewsSlug(base: string): Promise<string> {
  const slug = slugify(base) || "news";
  let candidate = slug;
  let counter = 1;
  while (await prisma.news.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${counter++}`;
  }
  return candidate;
}

export async function createNewsItem(input: NewsInput) {
  const slug = await uniqueNewsSlug(input.title);
  return prisma.news.create({
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      content: input.content,
      category: input.category ?? null,
      author: input.author ?? null,
      isActive: input.isActive,
      isPublished: input.isPublished,
      publishedAt: input.isPublished ? new Date() : null,
    },
  });
}

export async function updateNewsItem(id: string, input: z.infer<typeof newsUpdateSchema>) {
  const { title, excerpt, content, category, author, isActive, isPublished } = input;
  return prisma.news.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(excerpt !== undefined && { excerpt: excerpt ?? null }),
      ...(content !== undefined && { content }),
      ...(category !== undefined && { category: category ?? null }),
      ...(author !== undefined && { author: author ?? null }),
      ...(isActive !== undefined && { isActive }),
      ...(isPublished !== undefined && { isPublished }),
    },
  });
}

/* ── Partners (sponsors / federations / physio) ──────────────── */

export const PARTNER_TYPES = ["sponsor", "federation", "physio"] as const;

export const partnerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  logo: imageRefSchema.nullable().optional(),
  website: externalUrlSchema,
  role: z.string().trim().max(160).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  services: z.array(z.string().trim().min(1).max(200)).max(12).nullable().optional(),
  type: z.enum(PARTNER_TYPES),
  order: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export const partnerUpdateSchema = partnerSchema.partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

export type PartnerInput = z.infer<typeof partnerSchema>;

export async function createPartner(input: PartnerInput) {
  const { type, ...rest } = input;
  return prisma.partner.create({
    data: {
      type,
      name: rest.name,
      logo: rest.logo ?? null,
      website: rest.website ?? null,
      role: rest.role ?? null,
      location: rest.location ?? null,
      phone: rest.phone ?? null,
      services: rest.services ?? undefined,
      order: rest.order,
      isActive: rest.isActive,
    },
  });
}

export async function updatePartner(id: string, input: z.infer<typeof partnerUpdateSchema>) {
  const data: Record<string, unknown> = {};
  for (const key of ["name", "logo", "website", "role", "location", "phone", "services", "order", "isActive"] as const) {
    if (input[key] !== undefined) data[key] = input[key] ?? null;
  }
  return prisma.partner.update({ where: { id }, data });
}
