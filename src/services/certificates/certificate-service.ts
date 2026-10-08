import QRCode from "qrcode";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import prisma from "@/infrastructure/database/prisma";
import { createPdfDocument } from "@/services/certificates/pdfkit-fonts";
import { loadCertificateImage } from "@/services/certificates/certificate-images";
import { createModuleLogger } from "@/core/logger";
import { siteConfig } from "@/shared/config/site";
import { certificateVerificationUrl } from "@/modules/verify/verification-url";
import { isCertificateSnapshot } from "@/services/certificates/templates/certificate-snapshot";
import { certificatePdfFileName, renderSnapshotPdf } from "@/services/certificates/tournament-certificates.service";

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

async function renderPdf(content: CertificateContent, qrCode: string): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(certificateVerificationUrl(qrCode), { width: 200 });
  return generatePDF(content, qrDataUrl);
}

/** Renders + stores the PDF; returns its storage path, or null (logged) on failure. */
async function renderAndStore(content: CertificateContent, qrCode: string): Promise<string | null> {
  try {
    const pdfBuffer = await renderPdf(content, qrCode);
    return await getStorage().upload(pdfBuffer, `${content.certificateNumber}.pdf`, "certificates");
  } catch (err) {
    // The certificate record is still created (it verifies without a PDF),
    // but the failure must be visible — a silent null pdfPath looks like a
    // broken "View PDF" link to admins and members.
    log.error({ err, certificateNumber: content.certificateNumber }, "Certificate PDF generation/upload failed");
    return null;
  }
}

// ─── Printed content (shared by issuing and by re-rendering a missing PDF) ──

const REGISTRATION_TITLE = "Certificate of Registration";

/** Exactly what a player registration certificate prints, from its snapshot. */
function registrationCertificateContent(c: {
  title: string | null;
  recipientName: string;
  recipientIdLine: string;
  districtName: string | null;
  stateName: string | null;
  certificateNumber: string;
  issuedAt: Date;
  expiresAt: Date | null;
  signatories: SignatorySnapshot[];
}): CertificateContent {
  return {
    title: c.title ?? REGISTRATION_TITLE,
    recipientName: c.recipientName,
    recipientIdLine: c.recipientIdLine,
    bodyLines: [`has been duly registered as an official Player with the ${siteConfig.name}.`],
    locationLine: c.districtName ? `District: ${c.districtName}${c.stateName ? `, ${c.stateName}` : ""}` : null,
    certificateNumber: c.certificateNumber,
    issuedAt: c.issuedAt,
    expiresAt: c.expiresAt,
    signatories: c.signatories,
  };
}

/** Exactly what a tournament certificate prints, from its snapshot. */
function tournamentCertificateContent(c: {
  title: string;
  recipientName: string;
  recipientIdLine: string;
  eventName: string;
  position: string | null;
  eventStartDate: Date;
  eventEndDate: Date;
  /** "venue, city" as snapshotted. */
  venue: string | null;
  districtName: string | null;
  stateName: string | null;
  certificateNumber: string;
  issuedAt: Date;
  signatories: SignatorySnapshot[];
  logoUrl: string | null;
}): CertificateContent {
  const dates =
    formatDate(c.eventStartDate) === formatDate(c.eventEndDate)
      ? formatDate(c.eventStartDate)
      : `${formatDate(c.eventStartDate)} – ${formatDate(c.eventEndDate)}`;
  const locationParts = [c.venue, c.districtName, c.stateName].filter(Boolean);
  return {
    title: c.title,
    recipientName: c.recipientName,
    recipientIdLine: c.recipientIdLine,
    bodyLines: [`participated in ${c.eventName}`, ...(c.position ? [`Achievement: ${c.position}`] : []), dates],
    locationLine: locationParts.length ? locationParts.join(", ") : null,
    certificateNumber: c.certificateNumber,
    issuedAt: c.issuedAt,
    signatories: c.signatories,
    logoUrl: c.logoUrl,
  };
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
  const title = REGISTRATION_TITLE;
  const recipientIdLine = `Player ID: ${player.playerId}`;

  const pdfPath = await renderAndStore(
    registrationCertificateContent({
      title,
      recipientName: player.name,
      recipientIdLine,
      districtName: player.district.name,
      stateName,
      certificateNumber,
      issuedAt,
      expiresAt,
      signatories,
    }),
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
      recipientName: player.name,
      recipientIdLine,
      issuedById,
    },
  });
}

// ─── Tournament certificates ────────────────────────────────────────────────
// Issued through the template system: see tournament-certificates.service.ts.
// The renderer above stays only for certificates issued before templates
// existed (no `snapshot`), so their PDFs keep rendering exactly as issued.

// ─── PDF of an issued player certificate ────────────────────────────────────

/**
 * The certificate's PDF: the stored file when there is one. A certificate
 * whose PDF was never stored (or was lost with a non-persistent disk) is
 * rendered ONCE from its issue-time snapshot — same renderer, number, QR,
 * signatories, title and event — then stored, and that file is served from
 * then on. Never re-rendered because profile data changed: the recipient is
 * frozen on the row the first time (legacy rows had no recipient snapshot).
 */
export async function getPlayerCertificatePdf(certificateId: string): Promise<{ data: Buffer; fileName: string }> {
  const cert = await prisma.playerCertificate.findUnique({
    where: { id: certificateId },
    include: { player: { select: { name: true, playerId: true } } },
  });
  if (!cert) throw AppError.notFound("Certificate not found");
  const storage = getStorage();

  // Template certificate: always its own snapshot + the layout version it was issued with.
  if (isCertificateSnapshot(cert.snapshot)) {
    const fileName = certificatePdfFileName(cert.certificateNumber);
    if (cert.pdfPath) {
      const stored = await storage.read(cert.pdfPath);
      if (stored) return { data: stored.data, fileName };
    }
    const data = await renderSnapshotPdf(cert.snapshot);
    try {
      const pdfPath = await storage.upload(data, `${cert.id}-${fileName}`, "certificates");
      await prisma.playerCertificate.updateMany({ where: { id: cert.id }, data: { pdfPath } });
      log.info({ certificateNumber: cert.certificateNumber }, "Certificate PDF rendered from its snapshot and stored");
    } catch (err) {
      const stored = await storage.read(`certificates/${cert.id}-${fileName}`);
      if (stored) return { data: stored.data, fileName };
      log.error({ err, certificateNumber: cert.certificateNumber }, "Certificate PDF could not be stored");
    }
    return { data, fileName };
  }

  const fileName = `${cert.certificateNumber}.pdf`;
  if (cert.pdfPath) {
    const stored = await storage.read(cert.pdfPath);
    if (stored) return { data: stored.data, fileName };
  }

  const recipientName = cert.recipientName ?? cert.player.name;
  const recipientIdLine = cert.recipientIdLine ?? `Player ID: ${cert.player.playerId}`;
  const signatories = (Array.isArray(cert.signatories) ? cert.signatories : []) as unknown as SignatorySnapshot[];
  const content =
    cert.tournamentId && cert.eventName && cert.eventStartDate && cert.eventEndDate
      ? tournamentCertificateContent({
          title: cert.title ?? "Certificate of Participation",
          recipientName,
          recipientIdLine,
          eventName: cert.eventName,
          position: cert.position,
          eventStartDate: cert.eventStartDate,
          eventEndDate: cert.eventEndDate,
          venue: cert.venue,
          districtName: cert.districtName,
          stateName: cert.stateName,
          certificateNumber: cert.certificateNumber,
          issuedAt: cert.issuedAt,
          signatories,
          logoUrl: cert.logoUrl,
        })
      : registrationCertificateContent({
          title: cert.title,
          recipientName,
          recipientIdLine,
          districtName: cert.districtName,
          stateName: cert.stateName,
          certificateNumber: cert.certificateNumber,
          issuedAt: cert.issuedAt,
          expiresAt: cert.expiresAt,
          signatories,
        });
  const data = await renderPdf(content, cert.qrCode);

  let pdfPath = cert.pdfPath;
  try {
    pdfPath = await storage.upload(data, fileName, "certificates");
  } catch (err) {
    // Another request stored it first (write-once storage): serve that file.
    const stored = await storage.read(`certificates/${fileName}`);
    if (stored) return { data: stored.data, fileName };
    log.error({ err, certificateNumber: cert.certificateNumber }, "Certificate PDF could not be stored");
  }
  await prisma.playerCertificate.updateMany({
    where: { id: cert.id },
    data: {
      ...(pdfPath ? { pdfPath } : {}),
      ...(cert.recipientName ? {} : { recipientName }),
      ...(cert.recipientIdLine ? {} : { recipientIdLine }),
    },
  });
  log.info({ certificateNumber: cert.certificateNumber }, "Missing certificate PDF rendered from its snapshot and stored");
  return { data, fileName };
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
