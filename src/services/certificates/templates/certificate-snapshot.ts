import type { CertificateDateFormat, CertificateTemplateConfig } from "./template-config";

/**
 * Where a certificate image comes from, frozen at issue time: a bundled site
 * file (/images/…), an uploaded MediaAsset (immutable), or an https URL
 * (signature images entered as links).
 */
export interface ImageRef {
  imagePath?: string | null;
  mediaAssetId?: string | null;
}

export interface SnapshotSignatory {
  name: string;
  /** Designation as printed for this tournament (e.g. "Org. Secretary"). */
  designation: string;
  organization: string | null;
  signatureImageUrl: string | null;
}

/**
 * The immutable record of an issued template certificate — the ONLY input the
 * PDF is rendered from. Written once when the certificate is issued and never
 * updated, so later edits to the template, tournament, player, signatories or
 * assets cannot change an issued certificate.
 */
export interface CertificateSnapshot {
  schemaVersion: 1;
  template: {
    id: string;
    familyId: string;
    name: string;
    version: number;
    layout: string;
    config: CertificateTemplateConfig;
  };
  /** Asset id → frozen image source, for every asset the config references. */
  assets: Record<string, ImageRef>;
  certificateNumber: string;
  /** ISO date-time. */
  issueDate: string;
  /** Certificate heading actually printed (template heading or tournament title). */
  heading: string;
  tournament: {
    id: string;
    name: string;
    code: string | null;
    organizedBy: string | null;
    recognizedBy: string[];
    venue: string | null;
    stateName: string | null;
    districtName: string | null;
    startDate: string;
    endDate: string;
  };
  player: {
    id: string;
    playerCode: string;
    name: string;
    parentName: string | null;
    districtName: string;
    stateName: string | null;
  };
  /** The selected value and the full printed list it is ticked in. */
  category: { value: string | null; options: string[] };
  event: { value: string | null; options: string[] };
  achievement: { code: string; label: string };
  signatories: SnapshotSignatory[];
  verification: { qrCode: string; url: string };
}

export function isCertificateSnapshot(value: unknown): value is CertificateSnapshot {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 1);
}

// ─── Pure text helpers (shared by renderers and admin screens) ─────────────

export interface TextSegment {
  text: string;
  /** True for placeholder values — printed in the highlight colour. */
  dynamic: boolean;
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Expands a line template into printable segments. `[[ … ]]` groups vanish
 * when any placeholder inside them is empty; an unknown placeholder prints
 * empty. Whitespace runs collapse so dropped groups leave no double spaces.
 */
export function interpolateLine(template: string, values: Record<string, string | null | undefined>): TextSegment[] {
  const withoutEmptyGroups = template.replace(/\[\[([\s\S]*?)\]\]/g, (_m, inner: string) => {
    const names = [...inner.matchAll(PLACEHOLDER)].map((m) => m[1]);
    return names.every((n) => (values[n] ?? "").trim() !== "") ? inner : "";
  });
  const segments: TextSegment[] = [];
  let last = 0;
  for (const m of withoutEmptyGroups.matchAll(PLACEHOLDER)) {
    if (m.index! > last) segments.push({ text: withoutEmptyGroups.slice(last, m.index), dynamic: false });
    const value = (values[m[1]] ?? "").trim();
    if (value) segments.push({ text: value, dynamic: true });
    last = m.index! + m[0].length;
  }
  if (last < withoutEmptyGroups.length) segments.push({ text: withoutEmptyGroups.slice(last), dynamic: false });
  // Collapse whitespace across segment boundaries.
  const out: TextSegment[] = [];
  for (const seg of segments) {
    let text = seg.text.replace(/\s+/g, " ");
    const prev = out[out.length - 1];
    if (prev && prev.text.endsWith(" ") && text.startsWith(" ")) text = text.slice(1);
    if (!prev && text.startsWith(" ")) text = text.trimStart();
    if (text) out.push({ text, dynamic: seg.dynamic });
  }
  if (out.length) out[out.length - 1].text = out[out.length - 1].text.trimEnd();
  return out.filter((s) => s.text);
}

/** Certificate dates are calendar dates in India — never shifted by the server's time zone. */
export function formatCertificateDate(iso: string | Date, format: CertificateDateFormat): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: format === "NUMERIC" ? "2-digit" : "numeric",
    month: format === "NUMERIC" ? "2-digit" : "long",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  if (format === "NUMERIC") return `${get("day")}/${get("month")}/${get("year")}`;
  return format === "LONG_COMMA" ? `${get("day")} ${get("month")}, ${get("year")}` : `${get("day")} ${get("month")} ${get("year")}`;
}

/** "<prefix>/<serial>" with the serial zero-padded; longer serials are never truncated. */
export function formatCertificateNumber(prefix: string, serial: number, padding: number): string {
  return `${prefix.replace(/\/+$/, "")}/${String(serial).padStart(Math.max(1, padding), "0")}`;
}

/** Placeholder values for a snapshot (what the line templates can print). */
export function snapshotPlaceholderValues(s: CertificateSnapshot): Record<string, string | null> {
  const config = s.template.config;
  const stateShort = s.player.stateName ? config.stateAbbreviations[s.player.stateName] ?? s.player.stateName : null;
  return {
    certificateNumber: s.certificateNumber,
    issueDate: formatCertificateDate(s.issueDate, config.dateFormat),
    tournamentName: s.tournament.name,
    tournamentCode: s.tournament.code,
    organizedBy: s.tournament.organizedBy,
    playerName: s.player.name,
    parentName: s.player.parentName,
    playerCode: s.player.playerCode,
    district: s.player.districtName,
    state: s.player.stateName,
    stateShort,
    category: s.category.value,
    event: s.event.value,
    position: s.achievement.label,
    venue: s.tournament.venue,
  };
}
