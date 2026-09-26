import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { slugify } from "@/lib/utils";

/**
 * Google Drive URLs only. The link is stored as-is and opened in a new tab by
 * the browser — nothing server-side fetches, proxies, or validates reachability.
 */
export function isValidDriveUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      (parsed.hostname === "drive.google.com" ||
        parsed.hostname.endsWith(".drive.google.com") ||
        // Docs sharing links (docs.google.com/.../d/<id>/...) are commonly used
        // interchangeably with Drive sharing links for galleries.
        (parsed.hostname === "docs.google.com" && parsed.pathname.includes("/d/")))
    );
  } catch {
    return false;
  }
}

const driveUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isValidDriveUrl, {
    message: "Must be a valid Google Drive sharing URL (https://drive.google.com/...)",
  });

export const createGallerySchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().trim().min(1).max(500),
  driveUrl: driveUrlSchema.nullish(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isPublished: z.boolean().default(false),
});

export const updateGallerySchema = createGallerySchema
  .partial()
  .extend({
    driveUrl: driveUrlSchema.nullish(), // null removes the link
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "No changes provided",
  });

export type CreateGalleryInput = z.infer<typeof createGallerySchema>;
export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>;

export const GALLERY_CATEGORIES = [
  "Tournament",
  "Events",
  "Action",
  "Training",
  "Team",
  "Facilities",
  "Leadership",
] as const;

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = "gallery";
  let candidate = slug;
  let counter = 1;
  while (await prisma.gallery.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${counter++}`;
  }
  return candidate;
}

export async function createGalleryItem(input: CreateGalleryInput) {
  const slug = await uniqueSlug(input.title);
  return prisma.gallery.create({
    data: {
      title: input.title,
      slug,
      category: input.category,
      description: input.description ?? null,
      imageUrl: input.imageUrl,
      driveUrl: input.driveUrl ?? null,
      sortOrder: input.sortOrder,
      isPublished: input.isPublished,
      publishedAt: input.isPublished ? new Date() : null,
    },
  });
}

export async function updateGalleryItem(id: string, input: UpdateGalleryInput) {
  const data: {
    title?: string;
    category?: string;
    description?: string | null;
    imageUrl?: string;
    driveUrl?: string | null;
    sortOrder?: number;
    isPublished?: boolean;
    publishedAt?: Date | null;
  } = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.category !== undefined) data.category = input.category;
  if (input.description !== undefined) data.description = input.description ?? null;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.driveUrl !== undefined) data.driveUrl = input.driveUrl ?? null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  if (input.isPublished !== undefined) {
    data.isPublished = input.isPublished;
    // Keep publishedAt as the first-publish timestamp; only set it when an
    // item is published for the first time (unpublishing keeps the history).
    if (input.isPublished) {
      const existing = await prisma.gallery.findUnique({
        where: { id },
        select: { publishedAt: true },
      });
      data.publishedAt = existing?.publishedAt ?? new Date();
    }
  }

  return prisma.gallery.update({ where: { id }, data });
}

export async function deleteGalleryItem(id: string) {
  // GalleryImage rows cascade via the schema relation.
  return prisma.gallery.delete({ where: { id } });
}
