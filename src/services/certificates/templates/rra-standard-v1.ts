import QRCode from "qrcode";
import { createPdfDocument } from "@/services/certificates/pdfkit-fonts";
import { CERTIFICATE_FONTS, loadCertificateFonts } from "./fonts";
import { findAchievement } from "./positions";
import {
  formatCertificateDate,
  interpolateLine,
  snapshotPlaceholderValues,
  type CertificateSnapshot,
  type TextSegment,
} from "./certificate-snapshot";
import type { GenerateCertificateInput } from "./generate-certificate";

/**
 * "rra-standard@1" — the RRA Standard Tournament Certificate, drawn to match
 * the association's reference design (CorelDRAW original, 648 × 864 pt) on
 * A4 portrait. Geometry below is in the reference's coordinates and scaled
 * by X/Y/S, so every element keeps its place relative to the original.
 *
 * Pure: everything comes from the snapshot + already-loaded images. Each
 * dynamic text area has a fixed box and shrinks (then wraps) to fit — nothing
 * overflows into a neighbour, whatever the name/venue/title length.
 *
 * DO NOT change what this renders for existing inputs: certificates issued
 * with layout "rra-standard@1" are re-rendered by this exact code when their
 * stored PDF is missing. Design changes go into a new layout version.
 */

type Doc = PDFKit.PDFDocument;

const A4 = { w: 595.28, h: 841.89 };
const REF = { w: 648, h: 864 };
const KX = A4.w / REF.w;
const KY = A4.h / REF.h;
const X = (v: number) => v * KX;
const Y = (v: number) => v * KY;
const S = (v: number) => v * KX;

const SANS = CERTIFICATE_FONTS.sansBold.name;
const SCRIPT = CERTIFICATE_FONTS.script.name;
const SERIF_BI = "Times-BoldItalic";
const WHITE = "#FFFFFF";

// ─── Text primitives ────────────────────────────────────────────────────────

function width(doc: Doc, text: string, font: string, size: number): number {
  return doc.font(font).fontSize(size).widthOfString(text);
}

/** Text with the reference's white halo, so it stays crisp over the watermark. */
function haloText(doc: Doc, text: string, x: number, y: number, font: string, size: number, color: string, halo = 0.9) {
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
function wrapWords(doc: Doc, text: string, font: string, size: number, maxWidth: number): string[] {
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
function fitParagraph(doc: Doc, text: string, font: string, o: { maxSize: number; minSize: number; maxWidth: number; maxLines: number; maxHeight: number; lineGap: number }) {
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
function fitLine(doc: Doc, text: string, font: string, maxSize: number, minSize: number, maxWidth: number): number {
  let size = maxSize;
  while (size > minSize && width(doc, text, font, size) > maxWidth) size -= 0.25;
  while (size > 4 && width(doc, text, font, size) > maxWidth) size -= 0.25;
  return size;
}

// ─── Rich lines (ink + highlighted placeholder values) ──────────────────────

interface Token {
  text: string;
  dynamic: boolean;
}

function tokenize(segments: TextSegment[]): Token[] {
  const tokens: Token[] = [];
  for (const seg of segments) {
    for (const part of seg.text.split(/(\s+)/)) if (part) tokens.push({ text: part, dynamic: seg.dynamic });
  }
  return tokens;
}

function wrapTokens(doc: Doc, tokens: Token[], font: string, size: number, maxWidth: number): Token[][] {
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

const lineWidth = (doc: Doc, line: Token[], font: string, size: number) => line.reduce((sum, t) => sum + width(doc, t.text, font, size), 0);

// ─── Tick ───────────────────────────────────────────────────────────────────

/** The red brush tick of the reference, drawn as a vector (43 × 26 pt in reference units). */
function drawTick(doc: Doc, cx: number, top: number, color: string) {
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

interface OptionPiece {
  /** Text drawn; for positions an optional raised superscript after `prefix`. */
  prefix: string;
  superscript?: string;
  main: string;
  selected: boolean;
}

function pieceWidth(doc: Doc, p: OptionPiece, size: number) {
  return width(doc, p.prefix, SANS, size) + (p.superscript ? width(doc, p.superscript, SANS, size * 0.5) : 0) + width(doc, p.main, SANS, size);
}

/**
 * Draws "Label  opt1, opt2, opt3" centred on one line (shrinking to fit), or
 * on two lines when there are too many options. Ticks the selected option.
 */
function drawOptionRow(
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

function drawImage(doc: Doc, img: Buffer | null | undefined, x: number, y: number, w: number, h: number) {
  if (!img) return;
  try {
    doc.image(img, x, y, { fit: [w, h], align: "center", valign: "center" });
  } catch {
    // An undecodable image is skipped; the rest of the certificate renders.
  }
}

/** Pixel size of a PNG/JPEG from its header (aspect ratio for logo layout). */
function imageSize(buf: Buffer): { w: number; h: number } | null {
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
function drawLogoZone(doc: Doc, imgs: (Buffer | null)[], zone: { x0: number; x1: number; cy: number; h: number }) {
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

// ─── Renderer ───────────────────────────────────────────────────────────────

export async function renderRraStandardV1(input: GenerateCertificateInput): Promise<Buffer> {
  const s: CertificateSnapshot = input.snapshot;
  const c = s.template.config;
  const ink = c.colors.ink;
  const img = (id: string | null | undefined) => (id ? input.images[id] ?? null : null);

  const doc = await createPdfDocument({
    size: "A4",
    layout: "portrait",
    margin: 0,
    // PDFKit cannot serialise an undefined info value — omit absent keys.
    info: {
      Title: `${s.heading} ${s.certificateNumber} — ${s.tournament.name}`,
      ...(s.tournament.organizedBy ? { Author: s.tournament.organizedBy } : {}),
      Subject: `${s.player.name} — ${s.achievement.label}`,
      CreationDate: new Date(s.issueDate),
    },
  });
  for (const [name, data] of loadCertificateFonts()) doc.registerFont(name, data);
  const qrPng = c.showQr
    ? await QRCode.toBuffer(s.verification.url, { type: "png", margin: 1, width: 360, errorCorrectionLevel: "M" })
    : null;

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Frame + white sheet.
    if (c.frame.enabled) {
      doc.rect(0, 0, A4.w, A4.h).fill(c.frame.color);
      doc.rect(X(25.2), Y(25.2), A4.w - 2 * X(25.2), A4.h - 2 * Y(25.2)).fill(WHITE);
    } else {
      doc.rect(0, 0, A4.w, A4.h).fill(WHITE);
    }

    // Watermark (behind everything else).
    const watermark = img(c.watermark.assetId);
    if (watermark && c.watermark.opacity > 0) {
      doc.save();
      doc.opacity(c.watermark.opacity);
      drawImage(doc, watermark, X(76), Y(226), X(496), Y(465));
      doc.restore();
    }

    // Logo row: left group · central branding · right group.
    drawLogoZone(doc, c.logos.left.map(img), { x0: 56, x1: 252, cy: 105.5, h: 47 });
    drawImage(doc, img(c.logos.center), X(245.5), Y(28.3), X(160.7), Y(150.6));
    drawLogoZone(doc, c.logos.right.map(img), { x0: 399, x1: 590, cy: 103, h: 44 });

    // Tournament title (≤ 2 lines, shrinks for long names).
    {
      const area = { top: Y(181), height: Y(62), maxWidth: X(500) };
      const fit = fitParagraph(doc, s.tournament.name, SANS, { maxSize: S(23.5), minSize: S(12), maxWidth: area.maxWidth, maxLines: 3, maxHeight: area.height, lineGap: 1.15 });
      const lineH = fit.size * 1.15;
      let y = area.top + (area.height - fit.lines.length * lineH) / 2;
      for (const line of fit.lines) {
        haloText(doc, line, A4.w / 2 - width(doc, line, SANS, fit.size) / 2, y, SANS, fit.size, ink);
        y += lineH;
      }
    }

    // Organized By / Recognized by box.
    {
      const rows: { label: string; values: string[] }[] = [];
      if (s.tournament.organizedBy) rows.push({ label: c.labels.organizedBy, values: [s.tournament.organizedBy] });
      if (s.tournament.recognizedBy.length) rows.push({ label: c.labels.recognizedBy, values: s.tournament.recognizedBy });
      if (rows.length) {
        const box = { x: X(102.6), y: Y(248.1), w: X(435.2), h: Y(123.4) };
        doc.save();
        doc.roundedRect(box.x, box.y, box.w, box.h, S(13)).lineWidth(S(2)).stroke(c.colors.boxBorder);
        doc.restore();
        const labelCx = X(166);
        const colonX = X(239.5);
        const valueX = X(256.8);
        const valueW = box.x + box.w - valueX - X(10);
        const innerH = box.h - Y(12);
        // Size so that every (wrapped) value line fits the box.
        let size = S(15.8);
        let laid: { label: string; lines: string[] }[] = [];
        for (; size >= 6; size -= 0.25) {
          laid = rows.map((r) => ({ label: r.label, lines: r.values.flatMap((v) => wrapWords(doc, v, SANS, size, valueW)) }));
          const n = laid.reduce((sum, r) => sum + r.lines.length, 0);
          if (n * size * 1.35 <= innerH && laid.every((r) => r.lines.every((l) => width(doc, l, SANS, size) <= valueW))) break;
        }
        const labelSize = Math.min(size, S(15.8));
        const lineH = size * 1.35;
        const n = laid.reduce((sum, r) => sum + r.lines.length, 0);
        let y = box.y + (box.h - n * lineH) / 2;
        for (const r of laid) {
          const ls = fitLine(doc, r.label, SANS, labelSize, 6, colonX - box.x - X(14));
          haloText(doc, r.label, labelCx - width(doc, r.label, SANS, ls) / 2, y + (size - ls) / 2, SANS, ls, ink);
          haloText(doc, ":", colonX, y, SANS, size, ink);
          for (const line of r.lines) {
            haloText(doc, line, valueX, y, SANS, size, ink);
            y += lineH;
          }
        }
      }
    }

    // Serial number (left) and date (right).
    {
      const serial = `${c.labels.serialNumber} ${s.certificateNumber}`.trim();
      const date = `${c.labels.date} ${formatCertificateDate(s.issueDate, c.dateFormat)}`.trim();
      const serialSize = fitLine(doc, serial, SANS, S(12), S(8), X(215));
      const dateSize = fitLine(doc, date, SANS, S(12), S(8), X(150));
      haloText(doc, serial, X(67.3), Y(404.3), SANS, serialSize, ink);
      haloText(doc, date, X(583.9) - width(doc, date, SANS, dateSize), Y(403.5), SANS, dateSize, ink);
    }

    // Racquetball emblem.
    drawImage(doc, img(c.emblemAssetId), X(286.6), Y(382.6), X(74.8), Y(68.5));

    // Script heading with drop shadow and white outline.
    {
      const size = fitLine(doc, s.heading, SCRIPT, S(50), S(18), X(420));
      const w = width(doc, s.heading, SCRIPT, size);
      const x = A4.w / 2 - w / 2;
      const y = Y(493.7) - size * 0.95;
      doc.save();
      doc.opacity(0.35).font(SCRIPT).fontSize(size).fillColor(ink).text(s.heading, x + S(2.5), y + S(3.5), { lineBreak: false });
      doc.restore();
      doc.save();
      doc.font(SCRIPT).fontSize(size).lineWidth(S(4)).lineJoin("round").strokeColor(WHITE);
      doc.text(s.heading, x, y, { lineBreak: false, stroke: true, fill: false });
      doc.restore();
      doc.font(SCRIPT).fontSize(size).fillColor(ink).text(s.heading, x, y, { lineBreak: false });
    }

    // Recipient + district lines (placeholder values highlighted).
    {
      const values = snapshotPlaceholderValues(s);
      const paragraphs = [c.lines.recipient, c.lines.district]
        .filter((t) => t.trim())
        .map((t) => tokenize(interpolateLine(t, values)))
        .filter((t) => t.length);
      const area = { top: Y(537), height: Y(56), maxWidth: X(540) };
      let size = S(18);
      let laid: Token[][] = [];
      for (; size >= S(9); size -= 0.25) {
        laid = paragraphs.flatMap((p) => wrapTokens(doc, p, SERIF_BI, size, area.maxWidth));
        if (laid.length * size * 1.3 <= area.height && laid.every((l) => lineWidth(doc, l, SERIF_BI, size) <= area.maxWidth)) break;
      }
      const lineH = size * 1.3;
      let y = area.top + (area.height - laid.length * lineH) / 2;
      for (const line of laid) {
        let x = A4.w / 2 - lineWidth(doc, line, SERIF_BI, size) / 2;
        for (const t of line) {
          haloText(doc, t.text, x, y, SERIF_BI, size, t.dynamic ? c.colors.highlight : ink);
          x += width(doc, t.text, SERIF_BI, size);
        }
        y += lineH;
      }
    }

    // Category and Event rows — the full printed list with the player's option ticked.
    const plain = (options: string[], value: string | null): OptionPiece[] =>
      options.map((o) => ({ prefix: "", main: o, selected: value !== null && o === value }));
    if (c.showCategoryRow && s.category.options.length) {
      drawOptionRow(doc, { label: c.labels.category || null, pieces: plain(s.category.options, s.category.value), separator: ", ", top: Y(603), height: Y(34), maxSize: S(14.7), maxWidth: X(480), ink, tick: c.colors.tick });
    }
    if (c.showEventRow && s.event.options.length) {
      drawOptionRow(doc, { label: c.labels.event || null, pieces: plain(s.event.options, s.event.value), separator: ", ", top: Y(639.5), height: Y(34), maxSize: S(14.7), maxWidth: X(480), ink, tick: c.colors.tick });
    }

    // POSITION badge + achievement row.
    {
      if (c.labels.position) {
        const ls = S(10.8);
        const tw = width(doc, c.labels.position, SANS, ls);
        const bw = Math.max(X(76.7), tw + S(22));
        const bx = A4.w / 2 - bw / 2;
        const by = Y(680.3);
        const bh = Y(13.1);
        const tip = S(5);
        doc.polygon([bx, by + bh / 2], [bx + tip, by], [bx + bw - tip, by], [bx + bw, by + bh / 2], [bx + bw - tip, by + bh], [bx + tip, by + bh]).fill(ink);
        doc.font(SANS).fontSize(ls).fillColor(WHITE).text(c.labels.position, A4.w / 2 - tw / 2, by + (bh - ls * 1.36) / 2, { lineBreak: false });
      }
      const pieces: OptionPiece[] = c.positions
        .map((code) => findAchievement(code))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({ prefix: a.print.prefix, superscript: a.print.superscript, main: a.print.main, selected: a.code === s.achievement.code }));
      drawOptionRow(doc, { label: null, pieces, separator: " / ", top: Y(695.5), height: Y(24), maxSize: S(14.4), maxWidth: X(520), ink, tick: c.colors.tick });
    }

    // Venue bar (may grow to two lines; the signature area starts below it).
    let venueBottom = Y(747.9);
    if (s.tournament.venue) {
      const bar = { x: X(105.3), y: Y(726.6), w: X(437.4), h: Y(21.3) };
      const labelW = X(76.4);
      const venueText = s.tournament.venue;
      const valueMaxW = bar.w - labelW - X(16);
      let size = fitLine(doc, venueText, SANS, S(14.2), S(8), valueMaxW);
      let lines = [venueText];
      if (width(doc, venueText, SANS, size) > valueMaxW || size < S(8)) {
        const fit = fitParagraph(doc, venueText, SANS, { maxSize: S(11), minSize: S(6), maxWidth: valueMaxW, maxLines: 2, maxHeight: bar.h + Y(10), lineGap: 1.15 });
        size = fit.size;
        lines = fit.lines;
      }
      const barH = Math.max(bar.h, lines.length * size * 1.15 + Y(3));
      venueBottom = bar.y + barH;
      doc.rect(bar.x, bar.y, labelW, barH).fill(ink);
      doc.rect(bar.x, bar.y, bar.w, barH).lineWidth(S(1)).stroke(ink);
      const ls = fitLine(doc, c.labels.venue, SANS, S(14.2), 6, labelW - X(10));
      doc.font(SANS).fontSize(ls).fillColor(WHITE).text(c.labels.venue, bar.x + labelW / 2 - width(doc, c.labels.venue, SANS, ls) / 2, bar.y + (barH - ls * 1.36) / 2, { lineBreak: false });
      const valueCx = bar.x + labelW + (bar.w - labelW) / 2;
      let y = bar.y + (barH - lines.length * size * 1.15) / 2 - size * 0.1;
      for (const line of lines) {
        doc.font(SANS).fontSize(size).fillColor(ink).text(line, valueCx - width(doc, line, SANS, size) / 2, y, { lineBreak: false });
        y += size * 1.15;
      }
    }

    // Signatories either side of the centred QR code. Two signers sit exactly
    // where the reference has them; more split into a left zone (the extra
    // one) and a right zone, each divided into equal columns.
    {
      const signers = s.signatories.slice(0, c.maxSignatories);
      const n = signers.length;
      let slots: { cx: number; w: number }[];
      if (n <= 2) {
        slots = [{ cx: 156, w: 182 }, { cx: 492, w: 182 }].slice(0, n);
      } else {
        const zone = (x0: number, x1: number, count: number) =>
          Array.from({ length: count }, (_, i) => ({ cx: x0 + ((x1 - x0) / count) * (i + 0.5), w: (x1 - x0) / count - 6 }));
        slots = [...zone(40, 287, Math.ceil(n / 2)), ...zone(361, 608, Math.floor(n / 2))];
      }
      const imgTop = Math.max(Y(749), venueBottom + Y(2));
      const imgH = Math.max(Y(14), Y(788) - imgTop);
      signers.forEach((sig, i) => {
        const cx = X(slots[i].cx);
        const w = X(slots[i].w);
        drawImage(doc, input.signatureImages[i], cx - Math.min(w, X(90)) / 2, imgTop, Math.min(w, X(90)), imgH);
        const designationSize = fitLine(doc, sig.designation, SANS, S(12.5), 6, w);
        haloText(doc, sig.designation, cx - width(doc, sig.designation, SANS, designationSize) / 2, Y(788.3), SANS, designationSize, ink);
        const nameSize = fitLine(doc, sig.name, SANS, S(15.7), 6, w);
        haloText(doc, sig.name, cx - width(doc, sig.name, SANS, nameSize) / 2, Y(802.7) + (S(15.7) - nameSize) / 2, SANS, nameSize, ink);
        if (sig.organization) {
          const orgSize = fitLine(doc, sig.organization, SANS, S(10.5), 5, w);
          haloText(doc, sig.organization, cx - width(doc, sig.organization, SANS, orgSize) / 2, Y(821.1), SANS, orgSize, ink);
        }
      });
    }

    if (qrPng) {
      const q = S(50);
      doc.image(qrPng, A4.w / 2 - q / 2, Y(836) - q, { width: q, height: q });
    }

    // Preview stamp — never on an issued certificate.
    if (input.previewLabel) {
      doc.save();
      doc.opacity(0.13).font(SANS).fontSize(S(60)).fillColor("#000000");
      doc.rotate(-35, { origin: [A4.w / 2, A4.h / 2] });
      const tw = width(doc, input.previewLabel, SANS, S(60));
      doc.text(input.previewLabel, A4.w / 2 - tw / 2, A4.h / 2 - S(30), { lineBreak: false });
      doc.restore();
    }

    doc.end();
  });
}
