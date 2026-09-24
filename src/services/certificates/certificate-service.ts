import QRCode from "qrcode";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import prisma from "@/infrastructure/database/prisma";
import { createPdfDocument } from "@/services/certificates/pdfkit-fonts";

interface CertificateData {
  type: "player" | "coach";
  name: string;
  id: string;
  district: string;
  issuedAt: Date;
  expiresAt?: Date;
}

async function generatePDF(data: CertificateData, certificateNumber: string, qrDataUrl: string): Promise<Buffer> {
  const doc = await createPdfDocument({ size: "A4", layout: "landscape", margin: 50 });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0F172A");
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(3).stroke("#F59E0B");

    doc.fillColor("#F59E0B").fontSize(14).text("RAJASTHAN RACQUETBALL ASSOCIATION", 50, 60, { align: "center" });
    doc.fillColor("#FFFFFF").fontSize(32).text("CERTIFICATE OF REGISTRATION", 50, 90, { align: "center" });

    doc.fontSize(14).fillColor("#94A3B8").text(`This is to certify that`, 50, 160, { align: "center" });
    doc.fontSize(28).fillColor("#FFFFFF").text(data.name, 50, 185, { align: "center" });
    doc.fontSize(14).fillColor("#94A3B8").text(
      `has been duly registered as an official ${data.type === "player" ? "Player" : "Coach"} with the`,
      50, 230, { align: "center" }
    );
    doc.fillColor("#DC2626").fontSize(18).text("Rajasthan Racquetball Association", 50, 255, { align: "center" });

    doc.fillColor("#94A3B8").fontSize(12);
    doc.text(`${data.type === "player" ? "Player" : "Coach"} ID: ${data.id}`, 80, 310);
    doc.text(`District: ${data.district}`, 80, 330);
    doc.text(`Certificate No: ${certificateNumber}`, 80, 350);
    doc.text(`Issued: ${data.issuedAt.toLocaleDateString("en-IN")}`, 80, 370);
    if (data.expiresAt) {
      doc.text(`Valid Until: ${data.expiresAt.toLocaleDateString("en-IN")}`, 80, 390);
    }

    if (qrDataUrl) {
      const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      doc.image(Buffer.from(base64, "base64"), doc.page.width - 180, 300, { width: 100 });
      doc.fontSize(8).fillColor("#64748B").text("Scan to verify", doc.page.width - 180, 410, { width: 100, align: "center" });
    }

    doc.end();
  });
}

export interface IssueCertificateInput {
  certificateNumber?: string;
  issuedAt?: Date;
  expiresAt?: Date;
}

export async function issuePlayerCertificate(
  playerId: string,
  _approvedBy: string,
  input: IssueCertificateInput = {}
) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { district: true },
  });

  if (!player || player.status !== "APPROVED") {
    throw AppError.badRequest("Player not found or not approved");
  }

  const existingCert = await prisma.playerCertificate.findFirst({
    where: { playerId: player.id, isRevoked: false },
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

  const qrDataUrl = await QRCode.toDataURL(
    `${process.env.APP_URL}/verify?qrCode=${qrCode}`,
    { width: 200 }
  );

  let pdfPath: string | null = null;
  try {
    const pdfBuffer = await generatePDF(
      {
        type: "player",
        name: player.name,
        id: player.playerId,
        district: player.district.name,
        issuedAt,
        expiresAt,
      },
      certificateNumber,
      qrDataUrl
    );
    const storage = getStorage();
    pdfPath = await storage.upload(pdfBuffer, `${certificateNumber}.pdf`, "certificates");
  } catch {
    // Certificate record is still created if PDF generation fails
    pdfPath = null;
  }

  return prisma.playerCertificate.create({
    data: {
      certificateNumber,
      playerId: player.id,
      qrCode,
      issuedAt,
      expiresAt,
      pdfPath,
    },
  });
}

export async function issueCoachCertificate(coachId: string) {
  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    include: { district: true },
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

  const qrDataUrl = await QRCode.toDataURL(
    `${process.env.APP_URL}/verify?qrCode=${qrCode}`,
    { width: 200 }
  );

  const pdfBuffer = await generatePDF(
    {
      type: "coach",
      name: coach.name,
      id: coach.coachId,
      district: coach.district.name,
      issuedAt: new Date(),
      expiresAt,
    },
    certificateNumber,
    qrDataUrl
  );

  const storage = getStorage();
  const pdfPath = await storage.upload(pdfBuffer, `${certificateNumber}.pdf`, "certificates");

  return prisma.coachCertificate.create({
    data: {
      certificateNumber,
      coachId: coach.id,
      qrCode,
      expiresAt,
      pdfPath,
    },
  });
}
