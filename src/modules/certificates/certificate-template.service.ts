import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import {
  configAssetIds,
  parseTemplateConfig,
  templateConfigSchema,
  type CertificateTemplateConfig,
} from "@/services/certificates/templates/template-config";
import { CERTIFICATE_LAYOUTS, DEFAULT_LAYOUT } from "@/services/certificates/templates/generate-certificate";
import type { ImageRef } from "@/services/certificates/templates/certificate-snapshot";
import { loadCertificateImage, loadCertificateMediaAsset } from "@/services/certificates/certificate-images";

/**
 * Certificate templates and their image library (data layer). Rules:
 *  - a version with issued certificates is frozen: edits create a new
 *    version in the same family (old certificates keep theirs);
 *  - a version never changes layout key once created;
 *  - only ACTIVE versions can be chosen for new certificates;
 *  - assets referenced by any template cannot be removed, only deactivated
 *    for new selections (uploaded images are immutable).
 */

export interface TemplateSummary {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  version: number;
  layout: string;
  status: "ACTIVE" | "INACTIVE";
  isDefault: boolean;
  tournamentCount: number;
  certificateCount: number;
  isLatestVersion: boolean;
  updatedAt: Date;
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  const rows = await prisma.certificateTemplate.findMany({
    orderBy: [{ name: "asc" }, { version: "desc" }],
    include: { _count: { select: { tournaments: true, certificates: true } } },
  });
  const latest = new Map<string, number>();
  for (const r of rows) latest.set(r.familyId, Math.max(latest.get(r.familyId) ?? 0, r.version));
  return rows.map((r) => ({
    id: r.id,
    familyId: r.familyId,
    name: r.name,
    description: r.description,
    version: r.version,
    layout: r.layout,
    status: r.status,
    isDefault: r.isDefault,
    tournamentCount: r._count.tournaments,
    certificateCount: r._count.certificates,
    isLatestVersion: latest.get(r.familyId) === r.version,
    updatedAt: r.updatedAt,
  }));
}

export async function getTemplate(id: string) {
  const row = await prisma.certificateTemplate.findUnique({
    where: { id },
    include: { _count: { select: { tournaments: true, certificates: true } } },
  });
  if (!row) throw AppError.notFound("Template not found");
  return { ...row, config: parseTemplateConfig(row.config) };
}

/** The tournament's chosen template, else the default one. Must be ACTIVE to issue. */
export async function templateForTournament(templateId: string | null) {
  const row = templateId
    ? await prisma.certificateTemplate.findUnique({ where: { id: templateId } })
    : await prisma.certificateTemplate.findFirst({ where: { isDefault: true, status: "ACTIVE" }, orderBy: { version: "desc" } });
  if (!row) throw AppError.validation("No certificate template is configured. Choose one in the tournament's certificate settings.");
  if (row.status !== "ACTIVE") {
    throw AppError.validation(`Template "${row.name}" v${row.version} is deactivated. Choose an active template for this tournament.`);
  }
  return { ...row, config: parseTemplateConfig(row.config) };
}

// ─── Assets ─────────────────────────────────────────────────────────────────

export async function listAssets(opts: { activeOnly?: boolean } = {}) {
  return prisma.certificateAsset.findMany({
    where: opts.activeOnly ? { isActive: true } : {},
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

/** URL an admin screen can show for an asset thumbnail. */
export function assetUrl(a: { imagePath: string | null; mediaAssetId: string | null }): string | null {
  return a.imagePath ?? (a.mediaAssetId ? `/api/media/${a.mediaAssetId}` : null);
}

/** Frozen image sources for every asset a config references (snapshotted on certificates). */
export async function resolveAssetRefs(config: CertificateTemplateConfig): Promise<Record<string, ImageRef>> {
  const ids = [...new Set(configAssetIds(config))];
  if (!ids.length) return {};
  const rows = await prisma.certificateAsset.findMany({ where: { id: { in: ids } }, select: { id: true, imagePath: true, mediaAssetId: true } });
  return Object.fromEntries(rows.map((r) => [r.id, { imagePath: r.imagePath, mediaAssetId: r.mediaAssetId }]));
}

export async function loadImageRef(ref: ImageRef | undefined): Promise<Buffer | null> {
  if (!ref) return null;
  if (ref.mediaAssetId) return loadCertificateMediaAsset(ref.mediaAssetId);
  if (ref.imagePath) return loadCertificateImage(ref.imagePath);
  return null;
}

async function assertAssetsUsable(config: CertificateTemplateConfig) {
  const ids = [...new Set(configAssetIds(config))];
  if (!ids.length) return;
  const found = await prisma.certificateAsset.count({ where: { id: { in: ids }, isActive: true } });
  if (found !== ids.length) throw AppError.validation("One or more selected images are missing or deactivated");
}

// ─── Template writes ────────────────────────────────────────────────────────

export interface TemplateInput {
  name: string;
  description?: string | null;
  /** Design layout key; must be a registered layout. */
  layout?: string;
  config: unknown;
}

function validLayout(layout: string | undefined, fallback: string): string {
  const key = layout ?? fallback;
  if (!(key in CERTIFICATE_LAYOUTS)) throw AppError.validation(`Unknown design layout "${key}"`);
  return key;
}

function validConfig(value: unknown): CertificateTemplateConfig {
  const parsed = templateConfigSchema.safeParse(value);
  if (!parsed.success) throw AppError.validation(parsed.error.issues[0]?.message ?? "Invalid template configuration", parsed.error.issues);
  return parsed.data;
}

/** A new template family (version 1). */
export async function createTemplate(input: TemplateInput, userId: string) {
  const config = validConfig(input.config);
  await assertAssetsUsable(config);
  return prisma.certificateTemplate.create({
    data: {
      familyId: randomUUID(),
      name: input.name,
      description: input.description ?? null,
      version: 1,
      layout: validLayout(input.layout, DEFAULT_LAYOUT),
      config: config as unknown as Prisma.InputJsonValue,
      createdById: userId,
    },
  });
}

/**
 * Edits a version in place — only while no certificate has been issued with
 * it (issued certificates also carry their own config snapshot, but a used
 * version stays exactly what it was so "v1" always means one design).
 */
export async function updateTemplate(id: string, input: TemplateInput) {
  const existing = await getTemplate(id);
  if (existing._count.certificates > 0) {
    throw AppError.conflict("Certificates have been issued with this version. Save your changes as a new version instead.");
  }
  const config = validConfig(input.config);
  await assertAssetsUsable(config);
  return prisma.certificateTemplate.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description ?? null,
      layout: validLayout(input.layout, existing.layout),
      config: config as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Next version in the same family. Tournaments using the source version are
 * moved to the new one when `moveTournaments` (their future certificates use
 * it; issued certificates keep their version).
 */
export async function createTemplateVersion(sourceId: string, input: TemplateInput, userId: string, opts: { moveTournaments?: boolean } = {}) {
  const source = await getTemplate(sourceId);
  const config = validConfig(input.config);
  await assertAssetsUsable(config);
  return prisma.$transaction(async (tx) => {
    const top = await tx.certificateTemplate.aggregate({ where: { familyId: source.familyId }, _max: { version: true } });
    const created = await tx.certificateTemplate.create({
      data: {
        familyId: source.familyId,
        name: input.name,
        description: input.description ?? null,
        version: (top._max.version ?? source.version) + 1,
        layout: validLayout(input.layout, source.layout in CERTIFICATE_LAYOUTS ? source.layout : DEFAULT_LAYOUT),
        config: config as unknown as Prisma.InputJsonValue,
        isDefault: source.isDefault,
        createdById: userId,
      },
    });
    if (source.isDefault) await tx.certificateTemplate.update({ where: { id: source.id }, data: { isDefault: false } });
    if (opts.moveTournaments) {
      await tx.tournament.updateMany({ where: { certificateTemplateId: source.id }, data: { certificateTemplateId: created.id } });
    }
    return created;
  });
}

/** A copy as a separate template family (version 1). */
export async function duplicateTemplate(sourceId: string, name: string, userId: string) {
  const source = await getTemplate(sourceId);
  return prisma.certificateTemplate.create({
    data: {
      familyId: randomUUID(),
      name,
      description: source.description,
      version: 1,
      layout: source.layout,
      config: source.config as unknown as Prisma.InputJsonValue,
      createdById: userId,
    },
  });
}

export async function setTemplateStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const existing = await getTemplate(id);
  if (status === "INACTIVE" && existing.isDefault) {
    throw AppError.conflict("This is the default template. Make another template the default first.");
  }
  return prisma.certificateTemplate.update({ where: { id }, data: { status } });
}

export async function setDefaultTemplate(id: string) {
  const existing = await getTemplate(id);
  if (existing.status !== "ACTIVE") throw AppError.conflict("Only an active template can be the default");
  await prisma.$transaction([
    prisma.certificateTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    prisma.certificateTemplate.update({ where: { id }, data: { isDefault: true } }),
  ]);
}

// ─── Asset writes ───────────────────────────────────────────────────────────

export const ASSET_CATEGORIES = ["LOGO", "BRANDING", "EMBLEM", "WATERMARK", "SIGNATURE"] as const;

export async function createAsset(
  input: { name: string; category: string; imagePath?: string | null; mediaAssetId?: string | null },
  userId: string
) {
  if (!input.imagePath === !input.mediaAssetId) throw AppError.validation("Provide either an uploaded image or a site image path");
  if (input.imagePath && !(await loadCertificateImage(input.imagePath))) {
    throw AppError.validation("That site image could not be read. Use a PNG or JPEG under /images/.");
  }
  return prisma.certificateAsset.create({
    data: {
      name: input.name,
      category: input.category,
      imagePath: input.imagePath ?? null,
      mediaAssetId: input.mediaAssetId ?? null,
      createdById: userId,
    },
  });
}

export async function updateAsset(id: string, data: { name?: string; category?: string; isActive?: boolean }) {
  const existing = await prisma.certificateAsset.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Image not found");
  return prisma.certificateAsset.update({ where: { id }, data });
}

/** Template versions whose config references an asset (for "in use" warnings). */
export async function templatesUsingAsset(assetId: string) {
  const rows = await prisma.certificateTemplate.findMany({ select: { id: true, name: true, version: true, config: true } });
  return rows.filter((r) => configAssetIds(parseTemplateConfig(r.config)).includes(assetId)).map((r) => ({ id: r.id, name: r.name, version: r.version }));
}
