import { NextResponse } from "next/server";
import { withApiHandler } from "@/core/api/with-api-handler";
import { AppError } from "@/core/errors/app-error";
import prisma from "@/infrastructure/database/prisma";
import { requireAuth } from "@/security/auth/session";
import { hasPermission, PERMISSIONS, type SessionUser } from "@/security/rbac/permissions";
import { isFederationWide } from "@/security/rbac/district-scope";

/**
 * A stored file is only served when it is referenced by a record the caller
 * may see — knowing the path is never enough. Owners can read their own
 * documents; admins need the module's read permission and district access.
 * Unknown paths and unauthorized callers both get 404 (no existence oracle).
 * Public verification does not use this route.
 */
async function canAccessFile(user: SessionUser, filePath: string): Promise<boolean> {
  const inDistrict = (districtId: string) => isFederationWide(user) || user.districtId === districtId;

  const [playerCert, coachCert] = await Promise.all([
    prisma.playerCertificate.findFirst({
      where: { pdfPath: filePath },
      select: { player: { select: { userId: true, districtId: true } } },
    }),
    prisma.coachCertificate.findFirst({
      where: { pdfPath: filePath },
      select: { coach: { select: { userId: true, districtId: true } } },
    }),
  ]);

  const certOwner = playerCert?.player ?? coachCert?.coach;
  if (certOwner) {
    if (certOwner.userId && certOwner.userId === user.id) return true;
    return hasPermission(user, PERMISSIONS.CERTIFICATES_READ) && inDistrict(certOwner.districtId);
  }

  const membershipSelect = { select: { userId: true, districtId: true } } as const;
  const membership =
    (await prisma.clubMembership.findFirst({ where: { certificatePath: filePath }, ...membershipSelect })) ??
    (await prisma.schoolMembership.findFirst({ where: { certificatePath: filePath }, ...membershipSelect })) ??
    (await prisma.academyMembership.findFirst({ where: { certificatePath: filePath }, ...membershipSelect }));

  if (membership) {
    if (membership.userId && membership.userId === user.id) return true;
    return hasPermission(user, PERMISSIONS.MEMBERSHIPS_READ) && inDistrict(membership.districtId);
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

    const storageType = process.env.STORAGE_TYPE || (process.env.NETLIFY ? "netlify" : "local");

    if (storageType === "netlify") {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({
        name: process.env.NETLIFY_BLOBS_STORE || "rra-uploads",
        consistency: "strong",
      });
      const blob = await store.get(filePath, { type: "blob" });

      if (!blob) {
        throw AppError.notFound("File not found");
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(buffer, {
        headers: { ...headers, "Content-Type": blob.type || "application/pdf" },
      });
    }

    const fs = await import("fs/promises");
    const path = await import("path");
    const basePath = path.resolve(process.env.STORAGE_LOCAL_PATH || "./uploads");
    const fullPath = path.resolve(basePath, filePath);
    if (!fullPath.startsWith(basePath + path.sep)) {
      throw AppError.badRequest("Invalid file path");
    }

    try {
      const buffer = await fs.readFile(fullPath);
      return new NextResponse(buffer, {
        headers: { ...headers, "Content-Type": "application/pdf" },
      });
    } catch {
      throw AppError.notFound("File not found");
    }
  },
  { module: "files" }
);
