import QRCode from "qrcode";
import { createPdfDocument } from "@/services/certificates/pdfkit-fonts";
import { loadCertificateFonts } from "./fonts";
import { findAchievement } from "./positions";
import { formatCertificateDate, interpolateLine, snapshotPlaceholderValues, type CertificateSnapshot } from "./certificate-snapshot";
import type { GenerateCertificateInput } from "./generate-certificate";
import {
  A4,
  S,
  SANS,
  SCRIPT,
  SERIF_BI,
  type Token,
  type OptionPiece,
  WHITE,
  X,
  Y,
  drawImage,
  drawLogoZone,
  drawOptionRow,
  fitLine,
  fitParagraph,
  haloText,
  lineWidth,
  tokenize,
  width,
  wrapTokens,
  wrapWords,
} from "./pdf-primitives";

/**
 * "rra-standard@2" — the RRA tournament certificate on the association's
 * A4 background artwork (no frame; top logos, pink Rajasthan map watermark
 * and decoration are all in the background image). Everything printed on
 * top comes from the snapshot. Geometry is in the reference design's units
 * (648 × 864) via X/Y/S, in regions that never overlap:
 *
 *   background (full page) · title 158–244 · organisers box 248–371 ·
 *   S.No./date 404 · emblem 382–451 · heading ~466–523 · recipient 537–593 ·
 *   category 603–637 · event 639–673 · POSITION 680–719 · venue 726–748+ ·
 *   signatures ≥ venue bottom → 834 · QR 786–836
 *
 * Every text region has a fixed box and shrinks, then wraps, to fit.
 * DO NOT change what this renders for existing inputs once certificates are
 * issued with it — a design change is a new layout version.
 */
export async function renderRraStandardV2(input: GenerateCertificateInput): Promise<Buffer> {
  const s: CertificateSnapshot = input.snapshot;
  const c = s.template.config;
  const ink = c.colors.ink;
  const img = (id: string | null | undefined) => (id ? input.images[id] ?? null : null);

  const doc = await createPdfDocument({
    size: "A4",
    layout: "portrait",
    margin: 0,
    info: {
      Title: `${s.heading} ${s.certificateNumber} — ${s.tournament.name}`,
      ...(s.tournament.organizedBy ? { Author: s.tournament.organizedBy } : {}),
      Subject: `${s.player.name} — ${s.achievement.label}`,
      CreationDate: new Date(s.issueDate),
    },
  });
  for (const [name, data] of loadCertificateFonts()) doc.registerFont(name, data);
  const qrPng = c.showQr ? await QRCode.toBuffer(s.verification.url, { type: "png", margin: 1, width: 360, errorCorrectionLevel: "M" }) : null;

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Fixed visual layer ────────────────────────────────────────────────
    doc.rect(0, 0, A4.w, A4.h).fill(WHITE);
    const background = img(c.backgroundAssetId);
    if (background) {
      try {
        doc.image(background, 0, 0, { width: A4.w, height: A4.h });
      } catch {
        // An undecodable background leaves a white page; the content still renders.
      }
    }
    // Optional extra layers (normally empty when the background carries them).
    const watermark = img(c.watermark.assetId);
    if (watermark && c.watermark.opacity > 0) {
      doc.save();
      doc.opacity(c.watermark.opacity);
      drawImage(doc, watermark, X(76), Y(226), X(496), Y(465));
      doc.restore();
    }
    drawLogoZone(doc, c.logos.left.map(img), { x0: 30, x1: 238, cy: 85, h: 50 });
    drawImage(doc, img(c.logos.center), X(240), Y(22), X(168), Y(132));
    drawLogoZone(doc, c.logos.right.map(img), { x0: 410, x1: 618, cy: 85, h: 50 });

    // ── Tournament title: heading line + name (both dynamic, ≤ 4 lines) ──
    {
      const parts = [s.tournament.headingLine, s.tournament.name].map((p) => p?.trim()).filter((p): p is string => Boolean(p));
      const area = { top: Y(158), height: Y(86), maxWidth: X(540) };
      let size = S(23.5);
      let lines: string[] = [];
      for (; size >= S(10); size -= 0.25) {
        lines = parts.flatMap((p) => wrapWords(doc, p, SANS, size, area.maxWidth));
        if (lines.length <= 4 && lines.length * size * 1.18 <= area.height && lines.every((l) => width(doc, l, SANS, size) <= area.maxWidth)) break;
      }
      const lineH = size * 1.18;
      let y = area.top + (area.height - lines.length * lineH) / 2;
      for (const line of lines) {
        const ls = fitLine(doc, line, SANS, size, 4, area.maxWidth);
        haloText(doc, line, A4.w / 2 - width(doc, line, SANS, ls) / 2, y + (size - ls) / 2, SANS, ls, ink);
        y += lineH;
      }
    }

    // ── Organized By / Recognized by box ──────────────────────────────────
    {
      const rows: { label: string; values: string[] }[] = [];
      if (s.tournament.organizedBy) rows.push({ label: c.labels.organizedBy, values: [s.tournament.organizedBy] });
      if (s.tournament.recognizedBy.length) rows.push({ label: c.labels.recognizedBy, values: s.tournament.recognizedBy });
      if (rows.length) {
        const box = { x: X(102.6), y: Y(248.1), w: X(435.2), h: Y(123.4) };
        doc.save();
        doc.roundedRect(box.x, box.y, box.w, box.h, S(13)).fillOpacity(0.55).fill(WHITE);
        doc.restore();
        doc.save();
        doc.roundedRect(box.x, box.y, box.w, box.h, S(13)).lineWidth(S(2)).stroke(c.colors.boxBorder);
        doc.restore();
        const labelCx = X(166);
        const colonX = X(239.5);
        const valueX = X(256.8);
        const valueW = box.x + box.w - valueX - X(10);
        const innerH = box.h - Y(12);
        let size = S(15.8);
        let laid: { label: string; lines: string[] }[] = [];
        for (; size >= 6; size -= 0.25) {
          laid = rows.map((r) => ({ label: r.label, lines: r.values.flatMap((v) => wrapWords(doc, v, SANS, size, valueW)) }));
          const n = laid.reduce((sum, r) => sum + r.lines.length, 0);
          if (n * size * 1.35 <= innerH && laid.every((r) => r.lines.every((l) => width(doc, l, SANS, size) <= valueW))) break;
        }
        const lineH = size * 1.35;
        const n = laid.reduce((sum, r) => sum + r.lines.length, 0);
        let y = box.y + (box.h - n * lineH) / 2;
        for (const r of laid) {
          const ls = fitLine(doc, r.label, SANS, Math.min(size, S(15.8)), 6, colonX - box.x - X(14));
          haloText(doc, r.label, labelCx - width(doc, r.label, SANS, ls) / 2, y + (size - ls) / 2, SANS, ls, ink);
          haloText(doc, ":", colonX, y, SANS, size, ink);
          for (const line of r.lines) {
            haloText(doc, line, valueX, y, SANS, size, ink);
            y += lineH;
          }
        }
      }
    }

    // ── S.No. (left) and date (right) ─────────────────────────────────────
    {
      const serial = `${c.labels.serialNumber} ${s.certificateNumber}`.trim();
      const date = `${c.labels.date} ${formatCertificateDate(s.issueDate, c.dateFormat)}`.trim();
      const serialSize = fitLine(doc, serial, SANS, S(12), S(8), X(215));
      const dateSize = fitLine(doc, date, SANS, S(12), S(8), X(160));
      haloText(doc, serial, X(52), Y(404.3), SANS, serialSize, ink);
      haloText(doc, date, X(596) - width(doc, date, SANS, dateSize), Y(403.5), SANS, dateSize, ink);
    }

    // ── Racquetball emblem + script heading ───────────────────────────────
    drawImage(doc, img(c.emblemAssetId), X(286.6), Y(382.6), X(74.8), Y(68.5));
    {
      const size = fitLine(doc, s.heading, SCRIPT, S(50), S(18), X(440));
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

    // ── Recipient + district lines (values highlighted) ───────────────────
    {
      const values = snapshotPlaceholderValues(s);
      const paragraphs = [c.lines.recipient, c.lines.district]
        .filter((t) => t.trim())
        .map((t) => tokenize(interpolateLine(t, values)))
        .filter((t) => t.length);
      const area = { top: Y(535), height: Y(60), maxWidth: X(560) };
      let size = S(18);
      let laid: Token[][] = [];
      for (; size >= S(8); size -= 0.25) {
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

    // ── Category / Event: the player's own value (or the ticked list) ─────
    const pieces = (row: { value: string | null; options: string[] }): OptionPiece[] =>
      c.optionDisplay === "LIST_WITH_TICK"
        ? row.options.map((o) => ({ prefix: "", main: o, selected: row.value !== null && o === row.value }))
        : row.value
          ? [{ prefix: "", main: row.value, selected: false }]
          : [];
    if (c.showCategoryRow) {
      drawOptionRow(doc, { label: c.labels.category || null, pieces: pieces(s.category), separator: ", ", top: Y(603), height: Y(34), maxSize: S(14.7), maxWidth: X(540), ink, tick: c.colors.tick });
    }
    if (c.showEventRow) {
      drawOptionRow(doc, { label: c.labels.event || null, pieces: pieces(s.event), separator: ", ", top: Y(639.5), height: Y(34), maxSize: S(14.7), maxWidth: X(540), ink, tick: c.colors.tick });
    }

    // ── POSITION badge + achievement row (actual position ticked) ─────────
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
      const row: OptionPiece[] = c.positions
        .map((code) => findAchievement(code))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({ prefix: a.print.prefix, superscript: a.print.superscript, main: a.print.main, selected: a.code === s.achievement.code }));
      drawOptionRow(doc, { label: null, pieces: row, separator: " / ", top: Y(695.5), height: Y(24), maxSize: S(14.4), maxWidth: X(560), ink, tick: c.colors.tick });
    }

    // ── Venue bar (grows to two lines; signatures start below it) ─────────
    let venueBottom = Y(747.9);
    if (s.tournament.venue) {
      const bar = { x: X(90), y: Y(726.6), w: X(468), h: Y(21.3) };
      const labelW = X(76.4);
      const valueMaxW = bar.w - labelW - X(16);
      let size = fitLine(doc, s.tournament.venue, SANS, S(14.2), S(8), valueMaxW);
      let lines = [s.tournament.venue];
      if (width(doc, s.tournament.venue, SANS, size) > valueMaxW || size < S(8)) {
        const fit = fitParagraph(doc, s.tournament.venue, SANS, { maxSize: S(11), minSize: S(6), maxWidth: valueMaxW, maxLines: 2, maxHeight: bar.h + Y(10), lineGap: 1.15 });
        size = fit.size;
        lines = fit.lines;
      }
      const barH = Math.max(bar.h, lines.length * size * 1.15 + Y(3));
      venueBottom = bar.y + barH;
      doc.rect(bar.x, bar.y, bar.w, barH).fill(WHITE);
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

    // ── Signatories either side of the centred QR ─────────────────────────
    {
      const signers = s.signatories.slice(0, c.maxSignatories);
      const n = signers.length;
      const zone = (x0: number, x1: number, count: number) =>
        Array.from({ length: count }, (_, i) => ({ cx: x0 + ((x1 - x0) / count) * (i + 0.5), w: (x1 - x0) / count - 6 }));
      const slots = n <= 2 ? [{ cx: 150, w: 200 }, { cx: 498, w: 200 }].slice(0, n) : [...zone(28, 290, Math.ceil(n / 2)), ...zone(358, 620, Math.floor(n / 2))];
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
      const q = S(52);
      doc.image(qrPng, A4.w / 2 - q / 2, Y(840) - q, { width: q, height: q });
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
