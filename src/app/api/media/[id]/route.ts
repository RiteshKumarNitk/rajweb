import { NextResponse } from "next/server";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";

/**
 * Serves an uploaded file. Equipment images are public (immutable — a new
 * upload gets a new id). Requirement attachments need `equipment:read` and the
 * owning district/state in the caller's scope; otherwise 404 like a missing file.
 */
export const GET = withApiHandler(
  async (_request, { params }) => {
    const id = String(params?.id ?? "");
    if (!/^[a-z0-9]{10,40}$/i.test(id)) throw AppError.notFound("File not found");

    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: { kind: true, mimeType: true, data: true, fileName: true, stateId: true, districtId: true },
    });
    if (!asset) throw AppError.notFound("File not found");

    const isPublic = asset.kind === "EQUIPMENT_IMAGE";
    if (!isPublic) {
      const user = await requirePermission(PERMISSIONS.EQUIPMENT_READ);
      assertInScope(user, { stateId: asset.stateId, districtId: asset.districtId }, "File not found");
    }

    const safeName = (asset.fileName ?? "file").replace(/[^\w.\- ]+/g, "_");
    return new NextResponse(Buffer.from(asset.data), {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      },
    });
  },
  { module: "media" }
);
