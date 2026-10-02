import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";

export type MediaKind = "EQUIPMENT_IMAGE" | "REQUIREMENT_ATTACHMENT" | "GOVERNMENT_ID";

const LIMITS: Record<MediaKind, { maxBytes: number; types: string[] }> = {
  EQUIPMENT_IMAGE: { maxBytes: 2 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp"] },
  REQUIREMENT_ATTACHMENT: { maxBytes: 4 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp", "application/pdf"] },
  GOVERNMENT_ID: { maxBytes: 5 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp", "application/pdf"] },
};

/** File type from the content itself (magic bytes) — the client-declared type is never trusted. */
export function sniffMimeType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

export async function createMediaAsset(input: {
  kind: MediaKind;
  bytes: Uint8Array;
  fileName?: string | null;
  owner: { stateId: string | null; districtId: string | null };
  uploadedById: string;
}) {
  const limit = LIMITS[input.kind];
  if (input.bytes.length === 0) throw AppError.validation("The file is empty");
  if (input.bytes.length > limit.maxBytes) {
    throw AppError.validation(`The file is too large (max ${Math.round(limit.maxBytes / 1024 / 1024)} MB)`);
  }
  const mimeType = sniffMimeType(input.bytes);
  if (!mimeType || !limit.types.includes(mimeType)) {
    throw AppError.validation(
      input.kind === "EQUIPMENT_IMAGE" ? "Upload a PNG, JPEG or WebP image" : "Upload a PNG, JPEG, WebP image or a PDF"
    );
  }
  return prisma.mediaAsset.create({
    data: {
      kind: input.kind,
      mimeType,
      size: input.bytes.length,
      fileName: input.fileName?.slice(0, 200) ?? null,
      data: Buffer.from(input.bytes),
      stateId: input.owner.stateId,
      districtId: input.owner.districtId,
      uploadedById: input.uploadedById,
    },
    select: { id: true, kind: true, mimeType: true, size: true, fileName: true },
  });
}

export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}
