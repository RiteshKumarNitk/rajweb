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
  type CertificateSignatory,
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

    // Certificate QR codes open /verify?qrCode=…, and the verify forms send
    // whatever is in the single serial box as certificateNumber — so a QR
    // value must also resolve here, or every scanned certificate reads invalid.
    if (!qrCode) {
      const byQrValue = await lookupByQrCode(certificateNumber);
      if (byQrValue) return byQrValue;
    }
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
    include: { player: { include: { district: { include: { state: true } } } } },
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
    include: { player: { include: { district: { include: { state: true } } } } },
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
      district: { include: { state: true } },
      // Prefer the registration certificate (no tournament), then the newest.
      certificates: {
        where: { isRevoked: false },
        orderBy: [{ tournamentId: { sort: "asc", nulls: "first" } }, { issuedAt: "desc" }],
        take: 1,
      },
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
      district: { include: { state: true } },
      // Prefer the registration certificate (no tournament), then the newest.
      certificates: {
        where: { isRevoked: false },
        orderBy: [{ tournamentId: { sort: "asc", nulls: "first" } }, { issuedAt: "desc" }],
        take: 1,
      },
    },
  });

  if (player && player.certificates[0]) {
    return formatPlayerCert({ ...player.certificates[0], player });
  }

  return null;
}

interface SnapshotSigner {
  name?: unknown;
  designation?: unknown;
  organization?: unknown;
}

/** Signers exactly as printed on the certificate (snapshot), or null for legacy rows. */
function signatoryListFrom(snapshot: unknown): CertificateSignatory[] | null {
  if (!Array.isArray(snapshot) || snapshot.length === 0) return null;
  const list = (snapshot as SnapshotSigner[])
    .filter((s) => typeof s?.name === "string")
    .map((s) => ({
      name: s.name as string,
      title: typeof s.designation === "string" ? s.designation : "",
      organization: typeof s.organization === "string" ? s.organization : "",
      status: "OFFICIAL_VERIFIED" as const,
    }));
  return list.length ? list : null;
}

const shortDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Public verification view of a player certificate. Everything comes from the
 * certificate row's issue-time snapshot (falling back to the player's current
 * district for certificates issued before snapshots existed). Nothing private
 * (storage paths, issuer ids, contact details) is included.
 */
function formatPlayerCert(cert: {
  certificateNumber: string;
  issuedAt: Date;
  expiresAt: Date | null;
  tournamentId?: string | null;
  title?: string | null;
  eventName?: string | null;
  eventStartDate?: Date | null;
  eventEndDate?: Date | null;
  venue?: string | null;
  districtName?: string | null;
  stateName?: string | null;
  position?: string | null;
  signatories?: unknown;
  player: {
    name: string;
    playerId: string;
    category?: string | null;
    district: { name: string; state?: { name: string } | null };
  };
}): CertificateVerificationResult {
  const isTournament = Boolean(cert.tournamentId);
  const district = cert.districtName ?? cert.player.district.name;
  const stateName = cert.stateName ?? cert.player.district.state?.name ?? undefined;
  const signatoryList = signatoryListFrom(cert.signatories);
  const eventDates =
    cert.eventStartDate && cert.eventEndDate
      ? shortDate(cert.eventStartDate) === shortDate(cert.eventEndDate)
        ? shortDate(cert.eventStartDate)
        : `${shortDate(cert.eventStartDate)} – ${shortDate(cert.eventEndDate)}`
      : undefined;

  return {
    valid: true,
    certificateNumber: cert.certificateNumber,
    name: cert.player.name,
    title: cert.title ?? (isTournament ? "Certificate of Participation" : "Certificate of Registration"),
    championshipName: isTournament ? cert.eventName ?? "Tournament" : cert.title ?? "Player Registration",
    organizedBy: stateName ? `${district}, ${stateName}` : district,
    recognizedBy: [],
    district,
    stateName,
    category: cert.player.category ?? "",
    event: isTournament ? cert.eventName ?? "" : "Player Registration",
    position: cert.position ?? "",
    type: isTournament ? "championship" : "player",
    venue: cert.venue ?? undefined,
    eventDates,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    playerId: cert.player.playerId,
    ...(signatoryList ? { signatoryList } : {}),
    // Legacy pair: shown only for certificates issued before signatory snapshots.
    signatories: OFFICIAL_SIGNATORIES,
  };
}

function formatCoachCert(cert: {
  certificateNumber: string;
  issuedAt: Date;
  expiresAt: Date | null;
  coach: { name: string; coachId: string; district: { name: string } };
}): CertificateVerificationResult {
  return {
    valid: true,
    certificateNumber: cert.certificateNumber,
    name: cert.coach.name,
    title: "Certificate of Registration",
    championshipName: "Coach Registration",
    organizedBy: cert.coach.district.name,
    recognizedBy: [],
    district: cert.coach.district.name,
    category: "",
    event: "Coach Registration",
    position: "",
    type: "coach",
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    coachId: cert.coach.coachId,
    signatories: OFFICIAL_SIGNATORIES,
  };
}
