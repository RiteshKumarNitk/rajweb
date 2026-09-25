import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("verify");

export interface CertificateSignatory {
  name: string;
  title: string;
  organization: string;
  status: "OFFICIAL_VERIFIED" | "ACTIVE";
}

export interface CertificateVerificationResult {
  valid: boolean;
  message?: string;
  certificateNumber: string;
  name: string;
  fatherName?: string;
  championshipName: string;
  organizedBy: string;
  recognizedBy: string[];
  district: string;
  category: string;
  event: string;
  position: string;
  type: "player" | "coach" | "championship";
  venue?: string;
  issuedAt: Date | string;
  expiresAt?: Date | string | null;
  playerId?: string;
  coachId?: string;
  qrCode?: string;
  pdfPath?: string | null;
  signatories: {
    president: CertificateSignatory;
    generalSecretary: CertificateSignatory;
  };
}

export const OFFICIAL_SIGNATORIES = {
  president: {
    name: "Mr. Aamir Khan",
    title: "President",
    organization: "Rajasthan Racquetball Association",
    status: "OFFICIAL_VERIFIED" as const,
  },
  generalSecretary: {
    name: "Mr. Aashish Poonia",
    title: "General Secretary",
    organization: "Rajasthan Racquetball Association",
    status: "OFFICIAL_VERIFIED" as const,
  },
};

// Seeded / Sample State Championship certificates for instant testing and demo
export const SAMPLE_CHAMPIONSHIP_CERTIFICATES: CertificateVerificationResult[] = [
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/001",
    name: "Rohan Sharma",
    fatherName: "Mr. Suresh Sharma",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Jaipur",
    category: "Junior",
    event: "Single",
    position: "1ST PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/002",
    name: "Priya Choudhary",
    fatherName: "Mr. Ramesh Choudhary",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Jodhpur",
    category: "Senior",
    event: "Mix",
    position: "2ND PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/003",
    name: "Amit Verma",
    fatherName: "Mr. Rajesh Verma",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Udaipur",
    category: "Sub-junior",
    event: "Double",
    position: "3RD PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/004",
    name: "Kavita Meena",
    fatherName: "Mr. Ramavtar Meena",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Kota",
    category: "Senior",
    event: "Double-Mix",
    position: "PARTICIPATION AS PLAYER",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/005",
    name: "Vikram Singh Rathore",
    fatherName: "Mr. Mahendra Singh Rathore",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Bikaner",
    category: "Masters",
    event: "Single",
    position: "1ST PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/006",
    name: "Ananya Joshi",
    fatherName: "Mr. Devendra Joshi",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Ajmer",
    category: "Junior",
    event: "Double",
    position: "1ST PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
];

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
