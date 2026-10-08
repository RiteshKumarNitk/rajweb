import { z } from "zod";
import { CERTIFICATE_ACHIEVEMENTS } from "./positions";

/**
 * Structured configuration of a certificate template version — everything an
 * admin may change without touching code. No HTML/PDF code is ever exposed:
 * the drawing itself lives in the layout renderer (see registry.ts).
 *
 * Line templates use {{placeholders}} (see PLACEHOLDERS). A [[ … ]] group is
 * dropped when any placeholder inside it is empty, e.g.
 *   "Mr./Ms. {{playerName}}[[ Son / Daughter of {{parentName}}]]"
 * prints without the parent clause for a player with no parent name on file.
 * Placeholder values print in the highlight colour; literal text in ink.
 */

const hex = z.string().trim().regex(/^#[0-9a-f]{6}$/i, "Use a #RRGGBB colour");
const assetId = z.string().trim().min(1).max(40);
const label = (max: number) => z.string().trim().max(max);

export const DATE_FORMATS = {
  LONG_COMMA: "30 June, 2026",
  LONG: "30 June 2026",
  NUMERIC: "30/06/2026",
} as const;
export type CertificateDateFormat = keyof typeof DATE_FORMATS;

const achievementCodes = CERTIFICATE_ACHIEVEMENTS.map((a) => a.code) as [string, ...string[]];

/** How the Category / Event rows print (layout v2+; layout v1 always prints the list). */
export const OPTION_DISPLAYS = {
  SELECTED: "Only the player's own value (e.g. \"Category: Junior\")",
  LIST_WITH_TICK: "All options, the player's ticked",
} as const;
export type OptionDisplay = keyof typeof OPTION_DISPLAYS;

export const templateConfigSchema = z.object({
  frame: z.object({ enabled: z.boolean(), color: hex }),
  colors: z.object({ ink: hex, highlight: hex, tick: hex, boxBorder: hex }),
  logos: z.object({
    left: z.array(assetId).max(4),
    center: assetId.nullable(),
    right: z.array(assetId).max(4),
  }),
  emblemAssetId: assetId.nullable(),
  /** Full-page A4 background (layout v2+): logos, map watermark, decoration. */
  backgroundAssetId: assetId.nullable(),
  optionDisplay: z.enum(Object.keys(OPTION_DISPLAYS) as [OptionDisplay, ...OptionDisplay[]]),
  watermark: z.object({ assetId: assetId.nullable(), opacity: z.number().min(0).max(0.6) }),
  /** Script heading, e.g. "Certificate". A tournament's certificate title overrides it. */
  headingText: label(60).min(1),
  labels: z.object({
    serialNumber: label(30),
    date: label(30),
    organizedBy: label(30),
    recognizedBy: label(30),
    category: label(30),
    event: label(30),
    position: label(30),
    venue: label(30),
  }),
  lines: z.object({
    recipient: label(200).min(1),
    district: label(200),
  }),
  /** Printed short form of a state in the district line, e.g. Rajasthan → "Raj.". */
  stateAbbreviations: z.record(z.string().trim().min(1).max(60), z.string().trim().min(1).max(20)),
  dateFormat: z.enum(Object.keys(DATE_FORMATS) as [CertificateDateFormat, ...CertificateDateFormat[]]),
  showCategoryRow: z.boolean(),
  showEventRow: z.boolean(),
  /** Achievement codes printed in the POSITION row, in order. */
  positions: z.array(z.enum(achievementCodes)).min(1).max(6),
  maxSignatories: z.number().int().min(1).max(4),
  showQr: z.boolean(),
});

export type CertificateTemplateConfig = z.infer<typeof templateConfigSchema>;

/** Defaults of the RRA Standard Tournament Certificate (logo ids are filled by the seed). */
export const DEFAULT_TEMPLATE_CONFIG: CertificateTemplateConfig = {
  frame: { enabled: true, color: "#A7A9AC" },
  colors: { ink: "#221E1F", highlight: "#ED1C23", tick: "#ED1C23", boxBorder: "#D1D3D4" },
  logos: { left: [], center: null, right: [] },
  emblemAssetId: null,
  backgroundAssetId: null,
  optionDisplay: "SELECTED",
  watermark: { assetId: null, opacity: 0.16 },
  headingText: "Certificate",
  labels: {
    serialNumber: "S.No.",
    date: "Date : -",
    organizedBy: "Organized By",
    recognizedBy: "Recognized by",
    category: "Category:",
    event: "Event :",
    position: "POSITION",
    venue: "Venue :",
  },
  lines: {
    recipient: "Mr./Ms. {{playerName}}[[ Son / Daughter of {{parentName}}]]",
    district: "For Participated District {{district}}[[ ({{stateShort}})]]",
  },
  stateAbbreviations: { Rajasthan: "Raj." },
  dateFormat: "LONG_COMMA",
  showCategoryRow: true,
  showEventRow: true,
  positions: ["FIRST_PLACE", "SECOND_PLACE", "THIRD_PLACE", "PARTICIPATION"],
  maxSignatories: 2,
  showQr: true,
};

/** Placeholders usable in line templates, with what they print. */
export const PLACEHOLDERS: Record<string, string> = {
  certificateNumber: "Certificate number",
  issueDate: "Issue date",
  tournamentHeading: "Line above the tournament name",
  tournamentName: "Tournament name",
  tournamentCode: "Tournament code",
  organizedBy: "Organized by",
  playerName: "Player's full name",
  parentName: "Father's / mother's name",
  playerCode: "Player ID",
  district: "Participating district",
  state: "State",
  stateShort: "State short form (from State abbreviations)",
  category: "Category",
  event: "Event",
  position: "Position / achievement",
  venue: "Venue",
};

/**
 * Parses a stored config. Unknown/missing keys fall back to the defaults so a
 * config saved by an older admin screen still renders.
 */
export function parseTemplateConfig(value: unknown): CertificateTemplateConfig {
  const v = (value && typeof value === "object" ? value : {}) as Partial<CertificateTemplateConfig>;
  return templateConfigSchema.parse({
    ...DEFAULT_TEMPLATE_CONFIG,
    ...v,
    frame: { ...DEFAULT_TEMPLATE_CONFIG.frame, ...v.frame },
    colors: { ...DEFAULT_TEMPLATE_CONFIG.colors, ...v.colors },
    logos: { ...DEFAULT_TEMPLATE_CONFIG.logos, ...v.logos },
    watermark: { ...DEFAULT_TEMPLATE_CONFIG.watermark, ...v.watermark },
    labels: { ...DEFAULT_TEMPLATE_CONFIG.labels, ...v.labels },
    lines: { ...DEFAULT_TEMPLATE_CONFIG.lines, ...v.lines },
  });
}

/** Every asset id a config references (for resolving and for "in use" checks). */
export function configAssetIds(config: CertificateTemplateConfig): string[] {
  return [
    ...config.logos.left,
    ...(config.logos.center ? [config.logos.center] : []),
    ...config.logos.right,
    ...(config.emblemAssetId ? [config.emblemAssetId] : []),
    ...(config.backgroundAssetId ? [config.backgroundAssetId] : []),
    ...(config.watermark.assetId ? [config.watermark.assetId] : []),
  ];
}
