import { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { AppError } from "@/core/errors/app-error";
import { createModuleLogger } from "@/core/logger";
import { generateId } from "@/lib/utils";
import { certificateVerificationUrl } from "@/modules/verify/verification-url";
import { loadImageRef, resolveAssetRefs, templateForTournament } from "@/modules/certificates/certificate-template.service";
import { loadCertificateImage } from "@/services/certificates/certificate-images";
import { generateCertificate } from "@/services/certificates/templates/generate-certificate";
import { DEFAULT_ACHIEVEMENT, findAchievement } from "@/services/certificates/templates/positions";
import { parseTemplateConfig } from "@/services/certificates/templates/template-config";
import {
  formatCertificateNumber,
  isCertificateSnapshot,
  type CertificateSnapshot,
  type SnapshotSignatory,
} from "@/services/certificates/templates/certificate-snapshot";

const log = createModuleLogger("certificates");

/**
 * Template-based tournament certificates. Data retrieval lives here; drawing
 * is generateCertificate() (no database access). Flow per certificate:
 *
 *   tournament config + template version + registration/player + signatories
 *     → CertificateSnapshot (immutable)
 *     → one DB transaction: allocate the number + insert the certificate row
 *     → render the PDF from the snapshot → store it (write-once)
 *
 * A failure before commit leaves nothing behind (no number consumed, no row);
 * a PDF failure after commit leaves a complete row that renders from its
 * snapshot on first download.
 */

const ELIGIBLE_REGISTRATION_STATUSES = new Set(["PENDING", "APPROVED"]);

export interface TournamentCertificateEntry {
  playerId: string;
  /** Printed category (must be one of the tournament's category options). Defaults from the player. */
  category?: string | null;
  /** Printed event (must be one of the tournament's event options). Defaults from the registration. */
  event?: string | null;
  /** Achievement code, e.g. FIRST_PLACE. Defaults to PARTICIPATION. */
  achievement?: string | null;
  /** Used only when the player's record has no parent name. */
  parentName?: string | null;
}

export interface TournamentCertificateResult {
  issued: { id: string; playerId: string; playerName: string; certificateNumber: string; pdfStored: boolean }[];
  failed: { playerId: string; playerName: string | null; reason: string }[];
}

// ─── Context (loaded once per request) ──────────────────────────────────────

async function loadContext(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      state: { select: { name: true } },
      district: { select: { name: true } },
      registrationCategories: { where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { name: true, type: true } },
      signatories: {
        where: { signatory: { isActive: true } },
        orderBy: { sortOrder: "asc" },
        include: { signatory: true },
      },
    },
  });
  if (!tournament) throw AppError.notFound("Tournament not found");
  const template = await templateForTournament(tournament.certificateTemplateId);
  const assets = await resolveAssetRefs(template.config);
  const signatories: SnapshotSignatory[] = tournament.signatories.map((ts) => ({
    name: plain(ts.signatory.name),
    designation: plain(ts.title?.trim() || ts.signatory.designation),
    organization: plain(ts.signatory.organization),
    signatureImageUrl: ts.signatory.signatureImageUrl,
  }));
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    include: {
      category: { select: { name: true, type: true } },
      player: {
        select: {
          id: true,
          playerId: true,
          name: true,
          parentName: true,
          category: true,
          district: { select: { name: true, state: { select: { name: true } } } },
        },
      },
    },
  });
  const options = certificateOptions(tournament, registrations);
  return { tournament, template, assets, signatories, registrations, ...options };
}

type Context = Awaited<ReturnType<typeof loadContext>>;
type Registration = Context["registrations"][number];

const EVENT_TYPE_LABEL: Record<string, string> = { SINGLES: "Single", DOUBLES: "Double" };

/**
 * Printed option lists. Configured on the tournament; when not configured,
 * derived from this tournament's own data — player categories of its
 * registrations, and its registration categories (events).
 */
export function certificateOptions(
  tournament: { certificateCategoryOptions: string[]; certificateEventOptions: string[]; registrationCategories: { name: string }[] },
  registrations: { player: { category: string | null } }[]
) {
  const distinct = (values: (string | null | undefined)[]) => [...new Set(values.map((v) => plain(v)?.trim()).filter((v): v is string => Boolean(v)))];
  return {
    categoryOptions: tournament.certificateCategoryOptions.length
      ? tournament.certificateCategoryOptions.map((o) => plain(o))
      : distinct(registrations.map((r) => r.player.category)).sort((a, b) => a.localeCompare(b)),
    eventOptions: tournament.certificateEventOptions.length
      ? tournament.certificateEventOptions.map((o) => plain(o))
      : distinct(tournament.registrationCategories.map((c) => c.name)),
  };
}

const norm = (v: string) => v.toLowerCase().replace(/[\s_-]+/g, "");

/**
 * Text fields are stored HTML-escaped by sanitizeText() (names, venues,
 * tournament names…). A PDF is not HTML, so the snapshot holds the plain
 * text: "O&#x27;Brien" → "O'Brien", "Sports &amp; Rackets" → "Sports & Rackets".
 */
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'" };
function plain(value: string): string;
function plain(value: string | null | undefined): string | null;
function plain(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.replace(/&(amp|lt|gt|quot|#x27|#39);/g, (m) => ENTITIES[m] ?? m);
}

/** Canonical option matching `value` (case/spacing/hyphen-insensitive), or null. */
function matchOption(options: string[], value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return options.find((o) => norm(o) === norm(value)) ?? null;
}

/** Defaults an admin screen pre-selects for a registration. */
export function defaultSelections(ctx: { categoryOptions: string[]; eventOptions: string[] }, registration: { category: { name: string; type: string } | null; player: { category: string | null } }) {
  return {
    category: matchOption(ctx.categoryOptions, plain(registration.player.category)),
    event:
      matchOption(ctx.eventOptions, plain(registration.category?.name)) ??
      matchOption(ctx.eventOptions, registration.category ? EVENT_TYPE_LABEL[registration.category.type] : null),
  };
}

function assertIssuable(ctx: Context) {
  if (ctx.tournament.status !== "COMPLETED") {
    throw AppError.validation("Certificates can only be issued after the tournament is marked COMPLETED.");
  }
  if (ctx.signatories.length === 0) {
    throw AppError.validation("Assign at least one active certificate signatory to this tournament first.");
  }
  if (!ctx.tournament.certificateNumberPrefix?.trim()) {
    throw AppError.validation("Set the certificate number prefix (e.g. RRA/STC/1OP) in the tournament's certificate settings first.");
  }
}

/** Validates one entry against the tournament and builds its snapshot (number filled in later). */
function buildSnapshot(ctx: Context, registration: Registration, entry: TournamentCertificateEntry, numbering: { certificateNumber: string; qrCode: string }, issueDate: Date): CertificateSnapshot {
  const config = ctx.template.config;
  const defaults = defaultSelections(ctx, registration);

  const category = entry.category !== undefined ? matchOption(ctx.categoryOptions, entry.category) : defaults.category;
  if (entry.category && !category) throw AppError.validation(`"${entry.category}" is not one of this tournament's categories`);
  if (config.showCategoryRow && ctx.categoryOptions.length && !category) throw AppError.validation("Choose the player's category");

  const event = entry.event !== undefined ? matchOption(ctx.eventOptions, entry.event) : defaults.event;
  if (entry.event && !event) throw AppError.validation(`"${entry.event}" is not one of this tournament's events`);
  if (config.showEventRow && ctx.eventOptions.length && !event) throw AppError.validation("Choose the player's event");

  const achievementCode = entry.achievement || DEFAULT_ACHIEVEMENT;
  const achievement = findAchievement(achievementCode);
  if (!achievement || !config.positions.includes(achievementCode)) {
    throw AppError.validation(`Position "${achievementCode}" is not available on template "${ctx.template.name}"`);
  }

  const player = registration.player;
  const t = ctx.tournament;
  return {
    schemaVersion: 1,
    template: { id: ctx.template.id, familyId: ctx.template.familyId, name: ctx.template.name, version: ctx.template.version, layout: ctx.template.layout, config },
    assets: ctx.assets,
    certificateNumber: numbering.certificateNumber,
    issueDate: issueDate.toISOString(),
    heading: plain(t.certificateTitle?.trim() || config.headingText),
    tournament: {
      id: t.id,
      headingLine: plain(t.certificateTournamentHeading?.trim() || null),
      name: plain(t.name),
      code: t.code,
      organizedBy: plain(t.certificateOrganizedBy?.trim() || null),
      recognizedBy: t.certificateRecognizedBy.map((r) => plain(r).trim()).filter(Boolean),
      venue: plain([t.venue, t.city].map((v) => v?.trim()).filter(Boolean).join(", ") || null),
      stateName: plain(t.state?.name ?? null),
      districtName: plain(t.district?.name ?? null),
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
    },
    player: {
      id: player.id,
      playerCode: player.playerId,
      name: plain(player.name).trim(),
      parentName: plain(player.parentName?.trim() || entry.parentName?.trim() || null),
      districtName: plain(player.district.name),
      stateName: plain(player.district.state?.name ?? null),
    },
    category: { value: category, options: ctx.categoryOptions },
    event: { value: event, options: ctx.eventOptions },
    achievement: { code: achievement.code, label: achievement.label },
    signatories: ctx.signatories.slice(0, config.maxSignatories),
    verification: { qrCode: numbering.qrCode, url: certificateVerificationUrl(numbering.qrCode) },
  };
}

// ─── Numbering ──────────────────────────────────────────────────────────────

/**
 * Allocates the next serial for a prefix inside the caller's transaction.
 * One atomic upsert: concurrent transactions serialise on the sequence row,
 * so two certificates can never get the same serial; if the transaction
 * rolls back, so does the allocation. `start` raises the floor (a later,
 * higher starting number takes effect; a lower one never reuses serials).
 */
async function allocateSerial(tx: Prisma.TransactionClient, prefix: string, start: number): Promise<number> {
  const rows = await tx.$queryRaw<{ lastValue: number }[]>`
    INSERT INTO certificate_number_sequences (prefix, "lastValue", "updatedAt")
    VALUES (${prefix}, ${start}, now())
    ON CONFLICT (prefix) DO UPDATE
      SET "lastValue" = GREATEST(certificate_number_sequences."lastValue" + 1, ${start}), "updatedAt" = now()
    RETURNING "lastValue"`;
  return Number(rows[0].lastValue);
}

/** What the next certificate of a tournament will be numbered (for previews — nothing is reserved). */
export async function peekNextCertificateNumber(t: { certificateNumberPrefix: string | null; certificateNumberStart: number; certificateNumberPadding: number }): Promise<string | null> {
  const prefix = t.certificateNumberPrefix?.trim();
  if (!prefix) return null;
  const seq = await prisma.certificateNumberSequence.findUnique({ where: { prefix } });
  const next = Math.max(seq ? seq.lastValue + 1 : t.certificateNumberStart, t.certificateNumberStart);
  return formatCertificateNumber(prefix, next, t.certificateNumberPadding);
}

// ─── Rendering ──────────────────────────────────────────────────────────────

/** Renders a snapshot: loads its frozen images, then calls the pure generator. */
export async function renderSnapshotPdf(snapshot: CertificateSnapshot, opts: { previewLabel?: string; imageCache?: Map<string, Promise<Buffer | null>> } = {}): Promise<Buffer> {
  const cache = opts.imageCache ?? new Map<string, Promise<Buffer | null>>();
  const cached = (key: string, load: () => Promise<Buffer | null>) => {
    if (!cache.has(key)) cache.set(key, load());
    return cache.get(key)!;
  };
  const assetEntries = await Promise.all(
    Object.entries(snapshot.assets).map(async ([id, ref]) => [id, await cached(`asset:${ref.mediaAssetId ?? ref.imagePath}`, () => loadImageRef(ref))] as const)
  );
  const signatureImages = await Promise.all(
    snapshot.signatories.map((s) => (s.signatureImageUrl ? cached(`sig:${s.signatureImageUrl}`, () => loadCertificateImage(s.signatureImageUrl!)) : Promise.resolve(null)))
  );
  return generateCertificate({ snapshot, images: Object.fromEntries(assetEntries), signatureImages, previewLabel: opts.previewLabel });
}

export function certificatePdfFileName(certificateNumber: string): string {
  return `${certificateNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
}

/** Renders and stores an issued certificate's PDF; returns false (logged) on failure. */
async function storeIssuedPdf(id: string, snapshot: CertificateSnapshot, imageCache: Map<string, Promise<Buffer | null>>): Promise<boolean> {
  try {
    const pdf = await renderSnapshotPdf(snapshot, { imageCache });
    // The id keeps the stored name unique even if two numbers sanitise alike.
    const path = await getStorage().upload(pdf, `${id}-${certificatePdfFileName(snapshot.certificateNumber)}`, "certificates");
    await prisma.playerCertificate.updateMany({ where: { id, pdfPath: null }, data: { pdfPath: path } });
    return true;
  } catch (err) {
    log.error({ err, certificateNumber: snapshot.certificateNumber }, "Certificate PDF render/store failed — will render from snapshot on first download");
    return false;
  }
}

// ─── Issuing ────────────────────────────────────────────────────────────────

/** Rendering more than this per request is deferred to first download (serverless time limits). */
const RENDER_BUDGET_MS = 8000;

/**
 * Issues certificates for one tournament (one entry = one player). Each
 * certificate is its own transaction (number + row), so a failure for one
 * player never leaves a partial record or a consumed number, and never
 * affects the others. Entries are numbered in the order given.
 * The caller must already have checked the tournament is in the admin's scope.
 */
export async function issueTournamentCertificates(tournamentId: string, entries: TournamentCertificateEntry[], issuedById: string): Promise<TournamentCertificateResult> {
  const ctx = await loadContext(tournamentId);
  assertIssuable(ctx);
  const t = ctx.tournament;
  const prefix = t.certificateNumberPrefix!.trim();
  const issueDate = t.certificateIssueDate ?? new Date();
  const registrationByPlayer = new Map(ctx.registrations.map((r) => [r.playerId, r]));
  const seen = new Set<string>();
  const result: TournamentCertificateResult = { issued: [], failed: [] };
  const pending: { id: string; snapshot: CertificateSnapshot; index: number }[] = [];

  for (const entry of entries) {
    const registration = registrationByPlayer.get(entry.playerId);
    const playerName = registration?.player.name ?? null;
    const fail = (reason: string) => result.failed.push({ playerId: entry.playerId, playerName, reason });
    if (seen.has(entry.playerId)) {
      fail("Listed more than once");
      continue;
    }
    seen.add(entry.playerId);
    if (!registration || !ELIGIBLE_REGISTRATION_STATUSES.has(registration.status)) {
      fail("Not registered for this tournament");
      continue;
    }

    let snapshot!: CertificateSnapshot;
    try {
      // Validate everything before touching the sequence.
      buildSnapshot(ctx, registration, entry, { certificateNumber: "", qrCode: "" }, issueDate);
    } catch (err) {
      fail(err instanceof AppError ? err.message : "Invalid certificate details");
      continue;
    }

    let created: { id: string } | null = null;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const serial = await allocateSerial(tx, prefix, t.certificateNumberStart);
          const certificateNumber = formatCertificateNumber(prefix, serial, t.certificateNumberPadding);
          snapshot = buildSnapshot(ctx, registration, entry, { certificateNumber, qrCode: generateId("QR") }, issueDate);
          return tx.playerCertificate.create({
            data: {
              certificateNumber,
              playerId: registration.playerId,
              tournamentId,
              qrCode: snapshot.verification.qrCode,
              issuedAt: issueDate,
              title: snapshot.heading,
              eventName: t.name,
              eventStartDate: t.startDate,
              eventEndDate: t.endDate,
              venue: snapshot.tournament.venue,
              districtName: snapshot.player.districtName,
              stateName: snapshot.player.stateName,
              position: snapshot.achievement.label,
              signatories: snapshot.signatories as unknown as Prisma.InputJsonValue,
              recipientName: snapshot.player.name,
              recipientIdLine: `Player ID: ${snapshot.player.playerCode}`,
              issuedById,
              templateId: ctx.template.id,
              templateVersion: ctx.template.version,
              parentName: snapshot.player.parentName,
              categoryName: snapshot.category.value,
              eventLabel: snapshot.event.value,
              achievement: snapshot.achievement.code,
              tournamentCode: t.code,
              snapshot: snapshot as unknown as Prisma.InputJsonValue,
            },
            select: { id: true },
          });
        });
      } catch (err) {
        if ((err as { code?: string }).code !== "P2002") {
          log.error({ err, tournamentId, playerId: entry.playerId }, "Certificate issue failed");
          fail("Could not be issued (server error) — nothing was saved for this player");
          break;
        }
        // Unique violation: already issued for this player (concurrent request), or a
        // number taken outside the sequence — then the next attempt takes the next serial.
        const existing = await prisma.playerCertificate.findUnique({
          where: { tournamentId_playerId: { tournamentId, playerId: entry.playerId } },
          select: { certificateNumber: true },
        });
        if (existing) {
          fail(`Already issued: ${existing.certificateNumber}`);
          break;
        }
        if (attempt === 2) fail("Could not allocate a unique certificate number");
      }
    }
    if (!created) continue;
    result.issued.push({ id: created.id, playerId: entry.playerId, playerName: registration.player.name, certificateNumber: snapshot!.certificateNumber, pdfStored: false });
    pending.push({ id: created.id, snapshot: snapshot!, index: result.issued.length - 1 });
  }

  // PDFs after commit, within a time budget; the rest render on first download.
  const started = Date.now();
  const imageCache = new Map<string, Promise<Buffer | null>>();
  for (const p of pending) {
    if (Date.now() - started > RENDER_BUDGET_MS) break;
    result.issued[p.index].pdfStored = await storeIssuedPdf(p.id, p.snapshot, imageCache);
  }

  log.info({ tournamentId, issued: result.issued.length, failed: result.failed.length }, "Tournament certificates issued");
  return result;
}

/**
 * Preview with the tournament's real data and the number the next
 * certificate would get. Nothing is saved or reserved; the page is stamped.
 */
export async function previewTournamentCertificate(tournamentId: string, entry: TournamentCertificateEntry): Promise<Buffer> {
  const ctx = await loadContext(tournamentId);
  const registration = ctx.registrations.find((r) => r.playerId === entry.playerId);
  if (!registration) throw AppError.validation("This player is not registered for the tournament");
  const certificateNumber = (await peekNextCertificateNumber(ctx.tournament)) ?? "(set a number prefix)";
  const snapshot = buildSnapshot(ctx, registration, entry, { certificateNumber, qrCode: "PREVIEW" }, ctx.tournament.certificateIssueDate ?? new Date());
  return renderSnapshotPdf(snapshot, { previewLabel: "PREVIEW · NOT ISSUED" });
}

/** Options + per-registration defaults for the admin issue screen. */
export async function tournamentIssueOptions(tournamentId: string) {
  let ctx: Context;
  try {
    ctx = await loadContext(tournamentId);
  } catch (err) {
    if (err instanceof AppError && err.statusCode !== 404) return { ok: false as const, reason: err.message };
    throw err;
  }
  return {
    ok: true as const,
    template: { id: ctx.template.id, name: ctx.template.name, version: ctx.template.version, positions: ctx.template.config.positions },
    categoryOptions: ctx.categoryOptions,
    eventOptions: ctx.eventOptions,
    defaults: Object.fromEntries(ctx.registrations.map((r) => [r.playerId, { ...defaultSelections(ctx, r), parentName: r.player.parentName }])),
    nextNumber: await peekNextCertificateNumber(ctx.tournament),
  };
}

/**
 * Preview of a template version. For federation-wide viewers it uses the most
 * recently issued real certificate (re-dressed in this template) when there
 * is one; otherwise clearly labelled sample data. Stamped; nothing is saved.
 */
export async function previewTemplate(templateId: string, opts: { allowRealData: boolean }): Promise<Buffer> {
  const template = await prisma.certificateTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw AppError.notFound("Template not found");
  const config = parseTemplateConfig(template.config);
  const latest = !opts.allowRealData
    ? null
    : await prisma.playerCertificate.findFirst({
    where: { snapshot: { not: Prisma.AnyNull } },
    orderBy: { issuedAt: "desc" },
    select: { snapshot: true },
  });
  const base: CertificateSnapshot | null = latest && isCertificateSnapshot(latest.snapshot) ? latest.snapshot : null;
  const sample: CertificateSnapshot = base ?? {
    schemaVersion: 1,
    template: { id: "", familyId: "", name: "", version: 0, layout: "", config },
    assets: {},
    certificateNumber: "SAMPLE/0001",
    issueDate: new Date().toISOString(),
    heading: config.headingText,
    tournament: {
      id: "",
      name: "Sample Tournament Name — Racquetball Championship",
      code: "SAMPLE",
      organizedBy: "Sample Organising Association",
      recognizedBy: ["Sample Recognising Association"],
      venue: "Sample Venue, City",
      stateName: null,
      districtName: null,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    },
    player: { id: "", playerCode: "SAMPLE", name: "Sample Player", parentName: "Sample Parent", districtName: "Sample District", stateName: null },
    category: { value: "Category B", options: ["Category A", "Category B", "Category C"] },
    event: { value: "Event A", options: ["Event A", "Event B"] },
    achievement: { code: DEFAULT_ACHIEVEMENT, label: findAchievement(DEFAULT_ACHIEVEMENT)!.label },
    signatories: [
      { name: "Signatory One", designation: "Designation", organization: "Organisation", signatureImageUrl: null },
      { name: "Signatory Two", designation: "Designation", organization: "Organisation", signatureImageUrl: null },
    ],
    verification: { qrCode: "PREVIEW", url: certificateVerificationUrl("PREVIEW") },
  };
  const snapshot: CertificateSnapshot = {
    ...sample,
    template: { id: template.id, familyId: template.familyId, name: template.name, version: template.version, layout: template.layout, config },
    assets: await resolveAssetRefs(config),
    heading: config.headingText,
    achievement: config.positions.includes(sample.achievement.code)
      ? sample.achievement
      : { code: config.positions[0], label: findAchievement(config.positions[0])!.label },
    signatories: sample.signatories.slice(0, config.maxSignatories),
    verification: { qrCode: "PREVIEW", url: certificateVerificationUrl("PREVIEW") },
  };
  return renderSnapshotPdf(snapshot, { previewLabel: base ? "TEMPLATE PREVIEW" : "SAMPLE DATA" });
}
