import { CERTIFICATE_FONTS } from "./fonts";
import type { TextSegment } from "./certificate-snapshot";

/**
 * Drawing primitives shared by the certificate layouts: text fitting and
 * wrapping, highlighted rich lines, the brush tick, option rows and logo
 * rows. Geometry helpers X/Y/S map the association's reference design
 * (648 × 864 pt) onto A4 portrait — layouts are written in reference units.
 *
 * Layout files (rra-standard-v*.ts) stay frozen once certificates are issued
 * with them; changing a primitive here changes every layout, so a change must
 * keep existing renders pixel-identical (compare before/after renders).
 */

export type Doc = PDFKit.PDFDocument;

export const A4 = { w: 595.28, h: 841.89 };
export const REF = { w: 648, h: 864 };
export const KX = A4.w / REF.w;
export const KY = A4.h / REF.h;
export const X = (v: number) => v * KX;
export const Y = (v: number) => v * KY;
export const S = (v: number) => v * KX;

export const SANS = CERTIFICATE_FONTS.sansBold.name;
export const SCRIPT = CERTIFICATE_FONTS.script.name;
export const SERIF_BI = "Times-BoldItalic";
export const WHITE = "#FFFFFF";

// ─── Text primitives ────────────────────────────────────────────────────────

export function width(doc: Doc, text: string, font: string, size: number): number {
  return doc.font(font).fontSize(size).widthOfString(text);
}

/** Text with the reference's white halo, so it stays crisp over the watermark. */
export function haloText(doc: Doc, text: string, x: number, y: number, font: string, size: number, color: string, halo = 0.9) {
  doc.font(font).fontSize(size);
  if (halo > 0) {
    doc.save();
    doc.lineWidth(halo * 2).lineJoin("round").strokeColor(WHITE);
    doc.text(text, x, y, { lineBreak: false, stroke: true, fill: false });
    doc.restore();
  }
  doc.fillColor(color).text(text, x, y, { lineBreak: false });
}

/** Greedy word wrap of plain text at a size. */
export function wrapWords(doc: Doc, text: string, font: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (!line || width(doc, candidate, font, size) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Largest size (maxSize → minSize) at which `text` wraps into ≤ maxLines lines
 * of ≤ maxWidth that also fit maxHeight; at minSize the text is still wrapped
 * (and a too-long single word is shrunk below minSize to fit its width).
 */
export function fitParagraph(doc: Doc, text: string, font: string, o: { maxSize: number; minSize: number; maxWidth: number; maxLines: number; maxHeight: number; lineGap: number }) {
  for (let size = o.maxSize; size >= o.minSize; size -= 0.25) {
    const lines = wrapWords(doc, text, font, size, o.maxWidth);
    const fitsWidth = lines.every((l) => width(doc, l, font, size) <= o.maxWidth);
    if (fitsWidth && lines.length <= o.maxLines && lines.length * size * o.lineGap <= o.maxHeight) return { size, lines };
  }
  let size = o.minSize;
  let lines = wrapWords(doc, text, font, size, o.maxWidth);
  while (size > 4 && (lines.length > o.maxLines || lines.some((l) => width(doc, l, font, size) > o.maxWidth))) {
    size -= 0.25;
    lines = wrapWords(doc, text, font, size, o.maxWidth);
  }
  return { size, lines };
}

/** Shrinks a single line to fit `maxWidth` (never below `minSize`, unless it cannot fit otherwise). */
export function fitLine(doc: Doc, text: string, font: string, maxSize: number, minSize: number, maxWidth: number): number {
  let size = maxSize;
  while (size > minSize && width(doc, text, font, size) > maxWidth) size -= 0.25;
  while (size > 4 && width(doc, text, font, size) > maxWidth) size -= 0.25;
  return size;
}

// ─── Rich lines (ink + highlighted placeholder values) ──────────────────────

export interface Token {
  text: string;
  dynamic: boolean;
}

export function tokenize(segments: TextSegment[]): Token[] {
  const tokens: Token[] = [];
  for (const seg of segments) {
    for (const part of seg.text.split(/(\s+)/)) if (part) tokens.push({ text: part, dynamic: seg.dynamic });
  }
  return tokens;
}

export function wrapTokens(doc: Doc, tokens: Token[], font: string, size: number, maxWidth: number): Token[][] {
  const lines: Token[][] = [];
  let line: Token[] = [];
  let w = 0;
  for (const t of tokens) {
    const tw = width(doc, t.text, font, size);
    const isSpace = !t.text.trim();
    if (!isSpace && line.length && w + tw > maxWidth) {
      while (line.length && !line[line.length - 1].text.trim()) line.pop();
      lines.push(line);
      line = [];
      w = 0;
    }
    if (isSpace && !line.length) continue;
    line.push(t);
    w += tw;
  }
  while (line.length && !line[line.length - 1].text.trim()) line.pop();
  if (line.length) lines.push(line);
  return lines;
}

export const lineWidth = (doc: Doc, line: Token[], font: string, size: number) => line.reduce((sum, t) => sum + width(doc, t.text, font, size), 0);

// ─── Tick ───────────────────────────────────────────────────────────────────

/** The red brush tick of the reference, drawn as a vector (43 × 26 pt in reference units). */
export function drawTick(doc: Doc, cx: number, top: number, color: string) {
  const w = S(25);
  const h = S(20);
  const x0 = cx - w * 0.35;
  const p = (u: number, v: number): [number, number] => [x0 + u * w, top + v * h];
  doc.save();
  doc
    .polygon(p(0, 0.58), p(0.13, 0.46), p(0.36, 0.72), p(0.93, 0), p(1, 0.07), p(0.38, 1), p(0.31, 1))
    .fill(color);
  doc.restore();
}

// ─── Option rows (Category / Event / Position) with the selected one ticked ─

export interface OptionPiece {
  /** Text drawn; for positions an optional raised superscript after `prefix`. */
  prefix: string;
  superscript?: string;
  main: string;
  selected: boolean;
}

export function pieceWidth(doc: Doc, p: OptionPiece, size: number) {
  return width(doc, p.prefix, SANS, size) + (p.superscript ? width(doc, p.superscript, SANS, size * 0.5) : 0) + width(doc, p.main, SANS, size);
}

/**
 * Draws "Label  opt1, opt2, opt3" centred on one line (shrinking to fit), or
 * on two lines when there are too many options. Ticks the selected option.
 */
export function drawOptionRow(
  doc: Doc,
  o: { label: string | null; pieces: OptionPiece[]; separator: string; top: number; height: number; maxSize: number; maxWidth: number; ink: string; tick: string }
) {
  if (o.pieces.length === 0) return;
  const labelGap = (size: number) => (o.label ? width(doc, o.label, SANS, size) + size * 0.9 : 0);
  const sepW = (size: number) => width(doc, o.separator, SANS, size);
  const total = (pieces: OptionPiece[], size: number, withLabel: boolean) =>
    (withLabel ? labelGap(size) : 0) + pieces.reduce((s, p, i) => s + pieceWidth(doc, p, size) + (i ? sepW(size) : 0), 0);

  let size = o.maxSize;
  let lines: OptionPiece[][] = [o.pieces];
  while (size > 10 && total(o.pieces, size, true) > o.maxWidth) size -= 0.25;
  if (total(o.pieces, size, true) > o.maxWidth) {
    // Two lines: split where the first line is as full as possible.
    size = Math.min(o.maxSize, o.height / 2 / 1.2);
    for (;;) {
      let split = o.pieces.length;
      while (split > 1 && total(o.pieces.slice(0, split), size, true) > o.maxWidth) split--;
      lines = [o.pieces.slice(0, split), o.pieces.slice(split)].filter((l) => l.length);
      if ((lines.length < 2 || total(lines[1], size, false) <= o.maxWidth) && total(lines[0], size, true) <= o.maxWidth) break;
      if (size <= 5) break;
      size -= 0.25;
    }
  }

  const lineH = size * 1.2;
  let y = o.top + (o.height - lines.length * lineH) / 2;
  lines.forEach((pieces, li) => {
    const withLabel = li === 0;
    let x = A4.w / 2 - total(pieces, size, withLabel) / 2;
    if (withLabel && o.label) {
      haloText(doc, o.label, x, y, SANS, size, o.ink);
      x += labelGap(size);
    }
    pieces.forEach((p, i) => {
      if (i) {
        haloText(doc, o.separator, x, y, SANS, size, o.ink);
        x += sepW(size);
      }
      const start = x;
      if (p.prefix) {
        haloText(doc, p.prefix, x, y, SANS, size, o.ink);
        x += width(doc, p.prefix, SANS, size);
      }
      if (p.superscript) {
        haloText(doc, p.superscript, x, y - size * 0.02, SANS, size * 0.5, o.ink, 0.5);
        x += width(doc, p.superscript, SANS, size * 0.5);
      }
      haloText(doc, p.main, x, y, SANS, size, o.ink);
      x += width(doc, p.main, SANS, size);
      if (p.selected) drawTick(doc, (start + x) / 2, y - size * 0.7, o.tick);
    });
    y += lineH;
  });
}

// ─── Images ─────────────────────────────────────────────────────────────────

export function drawImage(doc: Doc, img: Buffer | null | undefined, x: number, y: number, w: number, h: number) {
  if (!img) return;
  try {
    doc.image(img, x, y, { fit: [w, h], align: "center", valign: "center" });
  } catch {
    // An undecodable image is skipped; the rest of the certificate renders.
  }
}

/** Pixel size of a PNG/JPEG from its header (aspect ratio for logo layout). */
export function imageSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}

/**
 * A row of logos centred in a zone at a common height, each as wide as its
 * aspect ratio needs; the whole row scales down when it would not fit.
 */
export function drawLogoZone(doc: Doc, imgs: (Buffer | null)[], zone: { x0: number; x1: number; cy: number; h: number }) {
  const list = imgs.filter((i): i is Buffer => Boolean(i));
  if (!list.length) return;
  const gap = S(6);
  const zoneW = X(zone.x1) - X(zone.x0);
  const aspects = list.map((img) => {
    const size = imageSize(img);
    return size && size.h > 0 ? Math.min(4, Math.max(0.4, size.w / size.h)) : 1;
  });
  let h = Y(zone.h);
  const natural = aspects.reduce((sum, a) => sum + a * h, 0) + gap * (list.length - 1);
  if (natural > zoneW) h *= (zoneW - gap * (list.length - 1)) / (natural - gap * (list.length - 1));
  const rowW = aspects.reduce((sum, a) => sum + a * h, 0) + gap * (list.length - 1);
  let x = X(zone.x0) + (zoneW - rowW) / 2;
  list.forEach((img, i) => {
    drawImage(doc, img, x, Y(zone.cy) - h / 2, aspects[i] * h, h);
    x += aspects[i] * h + gap;
  });
}
