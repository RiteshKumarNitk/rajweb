import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";

/**
 * Extracts and validates a YouTube video ID from common URL forms:
 *  - youtube.com/watch?v=<id> (+ query params)
 *  - youtu.be/<id>
 *  - youtube.com/shorts/<id>
 *  - youtube.com/embed/<id>
 *  - a bare 11-character video ID
 * Returns null for anything that is not a YouTube video reference — arbitrary
 * websites are rejected, and nothing is ever fetched server-side.
 */
export function extractYoutubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  // Bare ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "");
  const isYoutube = host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com";
  const isShort = host === "youtu.be";
  if (!isYoutube && !isShort) return null;

  if (isShort) {
    const id = url.pathname.split("/")[1] ?? "";
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (url.pathname === "/watch") {
    const v = url.searchParams.get("v");
    return v && /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
  }

  const embedMatch = url.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
  return embedMatch ? embedMatch[1] : null;
}

const youtubeInputSchema = z
  .string()
  .trim()
  .min(5)
  .max(500)
  .refine((v) => extractYoutubeVideoId(v) !== null, {
    message: "Must be a valid YouTube URL (youtube.com/watch, youtu.be, or youtube.com/shorts)",
  });

export const mediaVideoSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  youtubeUrl: youtubeInputSchema,
  category: z.string().trim().max(60).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export const mediaVideoUpdateSchema = mediaVideoSchema.partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

export type MediaVideoInput = z.infer<typeof mediaVideoSchema>;
export type MediaVideoUpdate = z.infer<typeof mediaVideoUpdateSchema>;

export async function createMediaVideo(input: MediaVideoInput) {
  const videoId = extractYoutubeVideoId(input.youtubeUrl);
  if (!videoId) throw AppError.validation("Must be a valid YouTube URL");

  const existing = await prisma.mediaVideo.findUnique({ where: { youtubeVideoId: videoId } });
  if (existing) {
    throw AppError.conflict("This YouTube video has already been added.");
  }

  return prisma.mediaVideo.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      youtubeVideoId: videoId,
      youtubeUrl: input.youtubeUrl,
      category: input.category ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
}

export async function updateMediaVideo(id: string, input: MediaVideoUpdate) {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description ?? null;
  if (input.category !== undefined) data.category = input.category ?? null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.youtubeUrl !== undefined) {
    const videoId = extractYoutubeVideoId(input.youtubeUrl);
    if (!videoId) throw AppError.validation("Must be a valid YouTube URL");
    const clash = await prisma.mediaVideo.findFirst({
      where: { youtubeVideoId: videoId, id: { not: id } },
    });
    if (clash) throw AppError.conflict("This YouTube video has already been added.");
    data.youtubeVideoId = videoId;
    data.youtubeUrl = input.youtubeUrl;
  }
  return prisma.mediaVideo.update({ where: { id }, data });
}

export async function deleteMediaVideo(id: string) {
  return prisma.mediaVideo.delete({ where: { id } });
}
