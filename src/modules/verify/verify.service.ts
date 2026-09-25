import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("verify");

export {
  type CertificateSignatory,
  type CertificateVerificationResult,
  OFFICIAL_SIGNATORIES,
  SAMPLE_CHAMPIONSHIP_CERTIFICATES,
} from "./verify.types";
import {
  type CertificateVerificationResult,
  OFFICIAL_SIGNATORIES,
  SAMPLE_CHAMPIONSHIP_CERTIFICATES,
} from "./verify.types";

export async function verifyCertificate(params: {
  certificateNumber?: string;
  qrCode?: string;
  name?: string;
  district?: string;
  fatherName?: string;
}) {
  const { certificateNumber, qrCode, name, district, fatherName } = params;

  if (!certificateNumber && !qrCode && !name) {
    throw AppError.badRequest("Please enter a Certificate Number, QR code, or Candidate Name to verify.");
  }

  // 1. Check Sample State Championship Certificates by Certificate Number / QR
  if (certificateNumber || qrCode) {
    const query = (certificateNumber || qrCode || "").trim().toLowerCase();
    const cleanQuery = query.replace(/[\/-]/g, "");

    const sampleMatch = SAMPLE_CHAMPIONSHIP_CERTIFICATES.find((item) => {
      const itemNum = item.certificateNumber.toLowerCase();
      const cleanItemNum = itemNum.replace(/[\/-]/g, "");
      return itemNum === query || cleanItemNum === cleanQuery || itemNum.includes(query);
    });

    if (sampleMatch) {
      log.info({ certificateNumber, type: "sample_championship" }, "Sample championship certificate verified");
      return sampleMatch;
    }
  }

  // 2. Lookup by Certificate Number in Database
  if (certificateNumber) {
    const byCertNumber = await lookupByCertificateNumber(certificateNumber);
    if (byCertNumber) return byCertNumber;

    const byMemberId = await lookupByMemberId(certificateNumber);
    if (byMemberId) return byMemberId;
  }

  // 3. Lookup by QR Code in Database
  if (qrCode) {
    const byQr = await lookupByQrCode(qrCode);
    if (byQr) return byQr;
  }

  // 4. Lookup by Candidate Name & District (Details-based verification)
  if (name) {
    const byDetails = await lookupByCandidateDetails({ name, district, fatherName });
    if (byDetails) return byDetails;
  }

  return {
    valid: false as const,
    certificateNumber: certificateNumber || "N/A",
    message: "No certificate found matching the provided details. Please verify the serial number or candidate details.",
    name: name || "Unknown",
    championshipName: "Rajasthan Racquetball State Championship",
    organizedBy: "Rajasthan Racquetball Association",
    recognizedBy: ["Rajasthan Racquetball Association"],
    district: district || "Rajasthan",
    category: "General",
    event: "General",
    position: "N/A",
    type: "championship" as const,
    issuedAt: new Date(),
    signatories: OFFICIAL_SIGNATORIES,
  };
}

async function lookupByCertificateNumber(certificateNumber: string) {
  const cleanNum = certificateNumber.trim();

  // Try exact match or normalized match in DB
  const playerCert = await prisma.playerCertificate.findFirst({
    where: {
      OR: [
        { certificateNumber: cleanNum },
        { certificateNumber: { equals: cleanNum, mode: "insensitive" } },
      ],
      isRevoked: false,
    },
    include: { player: { include: { district: true } } },
  });

  if (playerCert) {
    log.info({ certificateNumber, type: "player" }, "Player certificate verified");
    return formatPlayerCert(playerCert);
  }

  const coachCert = await prisma.coachCertificate.findFirst({
    where: {
      OR: [
        { certificateNumber: cleanNum },
        { certificateNumber: { equals: cleanNum, mode: "insensitive" } },
      ],
      isRevoked: false,
    },
    include: { coach: { include: { district: true } } },
  });

  if (coachCert) {
    log.info({ certificateNumber, type: "coach" }, "Coach certificate verified");
    return formatCoachCert(coachCert);
  }

  return null;
}

async function lookupByQrCode(qrCode: string) {
  const playerCert = await prisma.playerCertificate.findUnique({
    where: { qrCode: qrCode.trim() },
    include: { player: { include: { district: true } } },
  });

  if (playerCert && !playerCert.isRevoked) {
    return formatPlayerCert(playerCert);
  }

  const coachCert = await prisma.coachCertificate.findUnique({
    where: { qrCode: qrCode.trim() },
    include: { coach: { include: { district: true } } },
  });

  if (coachCert && !coachCert.isRevoked) {
    return formatCoachCert(coachCert);
  }

  return null;
}

async function lookupByMemberId(memberId: string) {
  const cleanId = memberId.trim();

  const player = await prisma.player.findFirst({
    where: {
      OR: [
        { playerId: cleanId },
        { playerId: { equals: cleanId, mode: "insensitive" } },
      ],
    },
    include: {
      district: true,
      certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" }, take: 1 },
    },
  });

  if (player) {
    const cert = player.certificates[0];
    if (cert) {
      log.info({ memberId, type: "player" }, "Certificate verified via player ID");
      return formatPlayerCert({ ...cert, player });
    }
  }

  const coach = await prisma.coach.findFirst({
    where: {
      OR: [
        { coachId: cleanId },
        { coachId: { equals: cleanId, mode: "insensitive" } },
      ],
    },
    include: {
      district: true,
      certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" }, take: 1 },
    },
  });

  if (coach) {
    const cert = coach.certificates[0];
    if (cert) {
      log.info({ memberId, type: "coach" }, "Certificate verified via coach ID");
      return formatCoachCert({ ...cert, coach });
    }
  }

  return null;
}

async function lookupByCandidateDetails(details: { name: string; district?: string; fatherName?: string }) {
  const queryName = details.name.trim().toLowerCase();

  // Check sample championship certificates by name
  const sampleMatch = SAMPLE_CHAMPIONSHIP_CERTIFICATES.find((item) => {
    const matchName = item.name.toLowerCase().includes(queryName);
    const matchDist = !details.district || item.district.toLowerCase().includes(details.district.trim().toLowerCase());
    return matchName && matchDist;
  });

  if (sampleMatch) {
    return sampleMatch;
  }

  // Check database players by name
  const player = await prisma.player.findFirst({
    where: {
      name: { contains: details.name.trim(), mode: "insensitive" },
      certificates: { some: { isRevoked: false } },
      ...(details.district ? { district: { name: { contains: details.district.trim(), mode: "insensitive" } } } : {}),
    },
    include: {
      district: true,
      certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" }, take: 1 },
    },
  });

  if (player && player.certificates[0]) {
    return formatPlayerCert({ ...player.certificates[0], player });
  }

  return null;
}

function formatPlayerCert(cert: {
  id?: string;
  certificateNumber: string;
  issuedAt: Date;
  expiresAt: Date | null;
  pdfPath?: string | null;
  player: { name: string; playerId: string; category?: string | null; district: { name: string } };
}): CertificateVerificationResult {
  return {
    valid: true,
    certificateNumber: cert.certificateNumber,
    name: cert.player.name,
    fatherName: "Official Registered Guardian",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: cert.player.district.name,
    category: cert.player.category || "Senior",
    event: "Single & Double",
    position: "PARTICIPATION AS PLAYER",
    type: "player",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    playerId: cert.player.playerId,
    pdfPath: cert.pdfPath,
    signatories: OFFICIAL_SIGNATORIES,
  };
}

function formatCoachCert(cert: {
  id?: string;
  certificateNumber: string;
  issuedAt: Date;
  expiresAt: Date | null;
  pdfPath?: string | null;
  coach: { name: string; coachId: string; district: { name: string } };
}): CertificateVerificationResult {
  return {
    valid: true,
    certificateNumber: cert.certificateNumber,
    name: cert.coach.name,
    fatherName: "Official Registered Guardian",
    championshipName: "Rajasthan Racquetball Coaching & Officiating Certification",
    organizedBy: "Rajasthan Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: cert.coach.district.name,
    category: "Certified State Coach",
    event: "Coaching & Officiating",
    position: "CERTIFIED COACH",
    type: "coach",
    venue: "Rajasthan State Sports Council, Jaipur",
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    coachId: cert.coach.coachId,
    pdfPath: cert.pdfPath,
    signatories: OFFICIAL_SIGNATORIES,
  };
}
