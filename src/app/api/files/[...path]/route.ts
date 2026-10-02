import { NextResponse } from "next/server";
import { withApiHandler } from "@/core/api/with-api-handler";
import { AppError } from "@/core/errors/app-error";
import prisma from "@/infrastructure/database/prisma";
import { requireAuth } from "@/security/auth/session";
import { hasPermission, PERMISSIONS, type SessionUser } from "@/security/rbac/permissions";
import { getOrgScope, isInScope } from "@/security/rbac/org-scope";
import { getStorage } from "@/infrastructure/storage/storage-adapter";

/**
 * A stored file is only served when it is referenced by a record the caller
 * may see — knowing the path is never enough. Owners can read their own
 * documents; admins need the module's read permission and district access.
 * Unknown paths and unauthorized callers both get 404 (no existence oracle).
 * Public verification does not use this route.
 */
async function canAccessFile(user: SessionUser, filePath: string): Promise<boolean> {
  const scope = getOrgScope(user);
  const inScope = (owner: { districtId: string; district: { stateId: string | null } | null }) =>
    isInScope(scope, { districtId: owner.districtId, stateId: owner.district?.stateId ?? null });

  const [playerCert, coachCert] = await Promise.all([
    prisma.playerCertificate.findFirst({
      where: { pdfPath: filePath },
      select: {
        player: { select: { userId: true, districtId: true, district: { select: { stateId: true } } } },
        tournament: { select: { stateId: true, districtId: true } },
      },
    }),
    prisma.coachCertificate.findFirst({
      where: { pdfPath: filePath },
      select: { coach: { select: { userId: true, districtId: true, district: { select: { stateId: true } } } } },
    }),
  ]);

  const certOwner = playerCert?.player ?? coachCert?.coach;
  if (certOwner) {
    if (certOwner.userId && certOwner.userId === user.id) return true;
    if (!hasPermission(user, PERMISSIONS.CERTIFICATES_READ)) return false;
    // Tournament certificates belong to the tournament's state/district.
    if (playerCert?.tournament) return isInScope(scope, playerCert.tournament);
    return inScope(certOwner);
  }

  const membershipSelect = {
    select: { userId: true, districtId: true, district: { select: { stateId: true } } },
  } as const;
  const membership =
    (await prisma.clubMembership.findFirst({ where: { certificatePath: filePath }, ...membershipSelect })) ??
    (await prisma.schoolMembership.findFirst({ where: { certificatePath: filePath }, ...membershipSelect })) ??
    (await prisma.academyMembership.findFirst({ where: { certificatePath: filePath }, ...membershipSelect }));

  if (membership) {
    if (membership.userId && membership.userId === user.id) return true;
    return hasPermission(user, PERMISSIONS.MEMBERSHIPS_READ) && inScope(membership);
  }

  return false;
}

export const GET = withApiHandler(
  async (_request, { params }) => {
    const user = await requireAuth();

    const pathParam = params?.path;
    const segments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
    const filePath = segments.join("/");

    if (!filePath || filePath.includes("..") || filePath.includes("\\") || filePath.includes("\u0000")) {
      throw AppError.badRequest("Invalid file path");
    }

    if (!(await canAccessFile(user, filePath))) {
      throw AppError.notFound("File not found");
    }

    const headers = {
      "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };

    // Same adapter the file was written with (local disk, Netlify Blobs or database).
    const file = await getStorage().read(filePath);
    if (!file) throw AppError.notFound("File not found");
    return new NextResponse(new Uint8Array(file.data), {
      headers: { ...headers, "Content-Type": file.contentType },
    });
  },
  { module: "files" }
);
