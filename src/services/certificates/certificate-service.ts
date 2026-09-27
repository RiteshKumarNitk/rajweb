import QRCode from "qrcode";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import prisma from "@/infrastructure/database/prisma";
import { createPdfDocument } from "@/services/certificates/pdfkit-fonts";
import { loadCertificateImage } from "@/services/certificates/certificate-images";
import { createModuleLogger } from "@/core/logger";
import { siteConfig } from "@/shared/config/site";

const log = createModuleLogger("certificates");

/** What is printed for one signer — snapshotted onto the certificate row. */
export interface SignatorySnapshot {
  name: string;
  designation: string;
  organization: string | null;
  signatureImageUrl: string | null;
}

interface CertificateContent {
  title: string;
  recipientName: string;
  /** e.g. "Player ID: PLR-…" */
  recipientIdLine: string;
  /** Sentence(s) under the recipient's name. */
  bodyLines: string[];
  locationLine: string | null;
  certificateNumber: string;
  issuedAt: Date;
  expiresAt?: Date | null;
  signatories: SignatorySnapshot[];
  logoUrl?: string | null;
}

const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

async function generatePDF(content: CertificateContent, qrDataUrl: string): Promise<Buffer> {
  const doc = await createPdfDocument({ size: "A4", layout: "landscape", margin: 50 });

  // Images are resolved before drawing; a missing/unreachable image is skipped.
  const logo = content.logoUrl ? await loadCertificateImage(content.logoUrl) : null;
  const signatureImages = await Promise.all(
    content.signatories.map((s) => (s.signatureImageUrl ? loadCertificateImage(s.signatureImageUrl) : Promise.resolve(null)))
  );

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;

    doc.rect(0, 0, W, H).fill("#0F172A");
    doc.rect(30, 30, W - 60, H - 60).lineWidth(3).stroke("#F59E0B");

    if (logo) {
      try {
        doc.image(logo, 55, 50, { fit: [70, 70] });
      } catch (err) {
        log.warn({ err }, "Certificate logo could not be drawn");
      }
    }

    doc.fillColor("#F59E0B").fontSize(14).text(siteConfig.name.toUpperCase(), 50, 60, { align: "center" });
    doc.fillColor("#FFFFFF").fontSize(28).text(content.title.toUpperCase(), 50, 88, { align: "center" });

    doc.fontSize(13).fillColor("#94A3B8").text("This is to certify that", 50, 145, { align: "center" });
    doc.fontSize(26).fillColor("#FFFFFF").text(content.recipientName, 50, 167, { align: "center" });

    let y = 210;
    for (const line of content.bodyLines) {
      doc.fontSize(13).fillColor("#CBD5E1").text(line, 90, y, { align: "center", width: W - 180 });
      y = doc.y + 4;
    }

    doc.fillColor("#94A3B8").fontSize(10.5);
    const detailsTop = Math.max(y + 12, 300);
    doc.text(content.recipientIdLine, 80, detailsTop);
    if (content.locationLine) doc.text(content.locationLine, 80, detailsTop + 16);
    doc.text(`Certificate No: ${content.certificateNumber}`, 80, detailsTop + 32);
    doc.text(`Issued: ${formatDate(content.issuedAt)}`, 80, detailsTop + 48);
    if (content.expiresAt) doc.text(`Valid Until: ${formatDate(content.expiresAt)}`, 80, detailsTop + 64);

    if (qrDataUrl) {
      const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      doc.image(Buffer.from(base64, "base64"), W - 170, detailsTop - 10, { width: 95 });
      doc.fontSize(8).fillColor("#64748B").text("Scan to verify", W - 170, detailsTop + 88, { width: 95, align: "center" });
    }

    // Signatures, in the tournament's signing order (up to 4 across the foot).
    const signers = content.signatories.slice(0, 4);
    if (signers.length > 0) {
      const areaLeft = 60;
      const areaWidth = W - 120;
      const slot = areaWidth / signers.length;
      const lineY = H - 105;
      signers.forEach((s, i) => {
        const x = areaLeft + slot * i + 20;
        const w = slot - 40;
        const img = signatureImages[i];
        if (img) {
          try {
            doc.image(img, x + w / 2 - 50, lineY - 42, { fit: [100, 38] });
          } catch (err) {
            log.warn({ err }, "Signature image could not be drawn");
          }
        }
        doc.moveTo(x, lineY).lineTo(x + w, lineY).lineWidth(0.8).stroke("#64748B");
        doc.fillColor("#FFFFFF").fontSize(10).text(s.name, x, lineY + 5, { width: w, align: "center" });
        doc.fillColor("#F59E0B").fontSize(8.5).text(s.designation, x, doc.y + 1, { width: w, align: "center" });
        if (s.organization) {
          doc.fillColor("#94A3B8").fontSize(7.5).text(s.organization, x, doc.y + 1, { width: w, align: "center" });
        }
      });
    }

    doc.end();
  });
}

/** Renders + stores the PDF; returns its storage path, or null (logged) on failure. */
async function renderAndStore(content: CertificateContent, qrCode: string): Promise<string | null> {
  try {
    const qrDataUrl = await QRCode.toDataURL(`${process.env.APP_URL}/verify?qrCode=${qrCode}`, { width: 200 });
    const pdfBuffer = await generatePDF(content, qrDataUrl);
    return await getStorage().upload(pdfBuffer, `${content.certificateNumber}.pdf`, "certificates");
  } catch (err) {
    // The certificate record is still created (it verifies without a PDF),
    // but the failure must be visible — a silent null pdfPath looks like a
    // broken "View PDF" link to admins and members.
    log.error({ err, certificateNumber: content.certificateNumber }, "Certificate PDF generation/upload failed");
    return null;
  }
}

function toSnapshot(s: { name: string; designation: string; organization: string | null; signatureImageUrl: string | null }): SignatorySnapshot {
  return { name: s.name, designation: s.designation, organization: s.organization, signatureImageUrl: s.signatureImageUrl };
}

/** Active state-level signatories (no district) of a state, in their display order. */
async function stateSignatories(stateId: string | null | undefined): Promise<SignatorySnapshot[]> {
  if (!stateId) return [];
  const rows = await prisma.certificateSignatory.findMany({
    where: { stateId, districtId: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 4,
  });
  return rows.map(toSnapshot);
}

// ─── Registration certificate ───────────────────────────────────────────────

export interface IssueCertificateInput {
  certificateNumber?: string;
  issuedAt?: Date;
  expiresAt?: Date;
}

/**
 * Player *registration* certificate (not tied to a tournament): at most one
 * active per player. Signed by the player's state officials at issue time.
 * The caller must already have checked the player is in the admin's scope.
 */
export async function issuePlayerCertificate(playerId: string, issuedById: string, input: IssueCertificateInput = {}) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { district: { include: { state: true } } },
  });

  if (!player || player.status !== "APPROVED") {
    throw AppError.badRequest("Player not found or not approved");
  }

  // Only registration certificates count here — tournament certificates are separate.
  const existingCert = await prisma.playerCertificate.findFirst({
    where: { playerId: player.id, tournamentId: null, isRevoked: false },
  });
  if (existingCert) {
    throw AppError.conflict(`Certificate already issued: ${existingCert.certificateNumber}`);
  }

  const certificateNumber = input.certificateNumber?.trim() || generateId("CERT");
  const qrCode = generateId("QR");
  const issuedAt = input.issuedAt ?? new Date();
  const expiresAt =
    input.expiresAt ??
    (() => {
      const d = new Date(issuedAt);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    })();

  const signatories = await stateSignatories(player.district.stateId);
  const stateName = player.district.state?.name ?? null;
  const title = "Certificate of Registration";

  const pdfPath = await renderAndStore(
    {
      title,
      recipientName: player.name,
      recipientIdLine: `Player ID: ${player.playerId}`,
      bodyLines: [`has been duly registered as an official Player with the ${siteConfig.name}.`],
      locationLine: `District: ${player.district.name}${stateName ? `, ${stateName}` : ""}`,
      certificateNumber,
      issuedAt,
      expiresAt,
      signatories,
    },
    qrCode
  );

  return prisma.playerCertificate.create({
    data: {
      certificateNumber,
      playerId: player.id,
      qrCode,
      issuedAt,
      expiresAt,
      pdfPath,
      title,
      districtName: player.district.name,
      stateName,
      signatories: signatories as unknown as object[],
      issuedById,
    },
  });
}

// ─── Tournament certificates ────────────────────────────────────────────────

export interface TournamentCertificateEntry {
  playerId: string;
  /** Optional achievement printed on the certificate, e.g. "Winner — Senior Singles". */
  position?: string | null;
}

export interface TournamentCertificateResult {
  issued: { id: string; playerId: string; playerName: string; certificateNumber: string; pdfPath: string | null }[];
  skipped: { playerId: string; reason: string }[];
}

const ELIGIBLE_REGISTRATION_STATUSES = ["PENDING", "APPROVED"] as const;

/**
 * Issues certificates for one tournament. Server-enforced rules:
 *  - the tournament must be COMPLETED (no certificates for unfinished events);
 *  - it must have at least one active signatory assigned;
 *  - each player must hold a (non-rejected) registration for THIS tournament;
 *  - one certificate per player per tournament (DB unique + pre-check).
 * Everything printed is snapshotted from this tournament, so certificates of
 * different tournaments never share titles, signers, dates or numbers.
 * The caller must already have checked the tournament is in the admin's scope.
 */
export async function issueTournamentCertificates(
  tournamentId: string,
  entries: TournamentCertificateEntry[],
  issuedById: string
): Promise<TournamentCertificateResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      district: { select: { name: true } },
      state: { select: { name: true } },
      signatories: {
        where: { signatory: { isActive: true } },
        orderBy: { sortOrder: "asc" },
        include: { signatory: true },
      },
    },
  });
  if (!tournament) throw AppError.notFound("Tournament not found");
  if (tournament.status !== "COMPLETED") {
    throw AppError.validation("Certificates can only be generated after the tournament is marked COMPLETED.");
  }
  if (tournament.signatories.length === 0) {
    throw AppError.validation("Assign at least one active certificate signatory to this tournament first.");
  }

  const signatories = tournament.signatories.map((ts) => toSnapshot(ts.signatory));
  const title = tournament.certificateTitle?.trim() || "Certificate of Participation";
  const locationParts = [tournament.venue, tournament.city, tournament.district?.name, tournament.state?.name].filter(Boolean);

  const byPlayer = new Map<string, TournamentCertificateEntry>();
  for (const e of entries) byPlayer.set(e.playerId, e);

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId, playerId: { in: [...byPlayer.keys()] } },
    include: { player: { select: { id: true, name: true, playerId: true } } },
  });
  const existing = await prisma.playerCertificate.findMany({
    where: { tournamentId, playerId: { in: [...byPlayer.keys()] } },
    select: { playerId: true, certificateNumber: true },
  });
  const alreadyIssued = new Map(existing.map((c) => [c.playerId, c.certificateNumber]));
  const registrationByPlayer = new Map(registrations.map((r) => [r.playerId, r]));

  const result: TournamentCertificateResult = { issued: [], skipped: [] };

  for (const [playerId, entry] of byPlayer) {
    const registration = registrationByPlayer.get(playerId);
    if (!registration || !ELIGIBLE_REGISTRATION_STATUSES.includes(registration.status as (typeof ELIGIBLE_REGISTRATION_STATUSES)[number])) {
      result.skipped.push({ playerId, reason: "Not registered for this tournament" });
      continue;
    }
    const issuedNumber = alreadyIssued.get(playerId);
    if (issuedNumber) {
      result.skipped.push({ playerId, reason: `Already issued: ${issuedNumber}` });
      continue;
    }

    const certificateNumber = generateId("CERT");
    const qrCode = generateId("QR");
    const issuedAt = new Date();
    const position = entry.position?.trim() || null;
    const dates =
      formatDate(tournament.startDate) === formatDate(tournament.endDate)
        ? formatDate(tournament.startDate)
        : `${formatDate(tournament.startDate)} – ${formatDate(tournament.endDate)}`;

    const pdfPath = await renderAndStore(
      {
        title,
        recipientName: registration.player.name,
        recipientIdLine: `Player ID: ${registration.player.playerId}`,
        bodyLines: [
          `participated in ${tournament.name}`,
          ...(position ? [`Achievement: ${position}`] : []),
          dates,
        ],
        locationLine: locationParts.length ? locationParts.join(", ") : null,
        certificateNumber,
        issuedAt,
        signatories,
        logoUrl: tournament.certificateLogoUrl,
      },
      qrCode
    );

    let createdId: string;
    try {
      const created = await prisma.playerCertificate.create({
        data: {
          certificateNumber,
          playerId,
          tournamentId,
          qrCode,
          issuedAt,
          pdfPath,
          title,
          eventName: tournament.name,
          eventStartDate: tournament.startDate,
          eventEndDate: tournament.endDate,
          venue: [tournament.venue, tournament.city].filter(Boolean).join(", ") || null,
          districtName: tournament.district?.name ?? null,
          stateName: tournament.state?.name ?? null,
          position,
          logoUrl: tournament.certificateLogoUrl,
          signatories: signatories as unknown as object[],
          issuedById,
        },
      });
      createdId = created.id;
    } catch (err) {
      // P2002: a concurrent request issued it first — report, don't fail the batch.
      if ((err as { code?: string }).code === "P2002") {
        result.skipped.push({ playerId, reason: "Already issued" });
        continue;
      }
      throw err;
    }

    result.issued.push({ id: createdId, playerId, playerName: registration.player.name, certificateNumber, pdfPath });
  }

  log.info({ tournamentId, issued: result.issued.length, skipped: result.skipped.length }, "Tournament certificates issued");
  return result;
}

// ─── Coach (not wired to any route yet) ────────────────────────────────────

export async function issueCoachCertificate(coachId: string) {
  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    include: { district: { include: { state: true } } },
  });

  if (!coach || coach.status !== "APPROVED") {
    throw AppError.badRequest("Coach not found or not approved");
  }

  const existingCert = await prisma.coachCertificate.findFirst({
    where: { coachId: coach.id, isRevoked: false },
  });
  if (existingCert) {
    throw AppError.conflict(`Certificate already issued: ${existingCert.certificateNumber}`);
  }

  const certificateNumber = generateId("CERT");
  const qrCode = generateId("QR");
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 2);

  const pdfPath = await renderAndStore(
    {
      title: "Certificate of Registration",
      recipientName: coach.name,
      recipientIdLine: `Coach ID: ${coach.coachId}`,
      bodyLines: [`has been duly registered as an official Coach with the ${siteConfig.name}.`],
      locationLine: `District: ${coach.district.name}${coach.district.state ? `, ${coach.district.state.name}` : ""}`,
      certificateNumber,
      issuedAt: new Date(),
      expiresAt,
      signatories: await stateSignatories(coach.district.stateId),
    },
    qrCode
  );

  return prisma.coachCertificate.create({
    data: { certificateNumber, coachId: coach.id, qrCode, expiresAt, pdfPath },
  });
}
