import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("verify");

export async function verifyCertificate(params: {
  certificateNumber?: string;
  qrCode?: string;
}) {
  const { certificateNumber, qrCode } = params;

  if (!certificateNumber && !qrCode) {
    throw AppError.badRequest("Certificate number or QR code required");
  }

  if (certificateNumber) {
    const byCertNumber = await lookupByCertificateNumber(certificateNumber);
    if (byCertNumber) return byCertNumber;

    const byMemberId = await lookupByMemberId(certificateNumber);
    if (byMemberId) return byMemberId;
  }

  if (qrCode) {
    const playerCert = await prisma.playerCertificate.findUnique({
      where: { qrCode },
      include: { player: { include: { district: true } } },
    });

    if (playerCert && !playerCert.isRevoked) {
      return formatPlayerCert(playerCert);
    }

    const coachCert = await prisma.coachCertificate.findUnique({
      where: { qrCode },
      include: { coach: { include: { district: true } } },
    });

    if (coachCert && !coachCert.isRevoked) {
      return formatCoachCert(coachCert);
    }
  }

  return { valid: false as const, message: "Certificate not found or has been revoked" };
}

async function lookupByCertificateNumber(certificateNumber: string) {
  const playerCert = await prisma.playerCertificate.findUnique({
    where: { certificateNumber },
    include: { player: { include: { district: true } } },
  });

  if (playerCert && !playerCert.isRevoked) {
    log.info({ certificateNumber, type: "player" }, "Certificate verified");
    return formatPlayerCert(playerCert);
  }

  const coachCert = await prisma.coachCertificate.findUnique({
    where: { certificateNumber },
    include: { coach: { include: { district: true } } },
  });

  if (coachCert && !coachCert.isRevoked) {
    log.info({ certificateNumber, type: "coach" }, "Certificate verified");
    return formatCoachCert(coachCert);
  }

  return null;
}

async function lookupByMemberId(memberId: string) {
  const player = await prisma.player.findUnique({
    where: { playerId: memberId },
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
    return {
      valid: false as const,
      message: `Player ${player.name} (${memberId}) is registered but no active certificate has been issued yet.`,
    };
  }

  const coach = await prisma.coach.findUnique({
    where: { coachId: memberId },
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
    return {
      valid: false as const,
      message: `Coach ${coach.name} (${memberId}) is registered but no active certificate has been issued yet.`,
    };
  }

  return null;
}

function formatPlayerCert(cert: {
  certificateNumber: string;
  issuedAt: Date;
  expiresAt: Date | null;
  player: { name: string; playerId: string; district: { name: string } };
}) {
  return {
    valid: true as const,
    type: "player" as const,
    certificateNumber: cert.certificateNumber,
    name: cert.player.name,
    playerId: cert.player.playerId,
    district: cert.player.district.name,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
  };
}

function formatCoachCert(cert: {
  certificateNumber: string;
  issuedAt: Date;
  expiresAt: Date | null;
  coach: { name: string; coachId: string; district: { name: string } };
}) {
  return {
    valid: true as const,
    type: "coach" as const,
    certificateNumber: cert.certificateNumber,
    name: cert.coach.name,
    coachId: cert.coach.coachId,
    district: cert.coach.district.name,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
  };
}
