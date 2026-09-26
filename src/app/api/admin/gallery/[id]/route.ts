import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import {
  updateGallerySchema,
  updateGalleryItem,
  deleteGalleryItem,
} from "@/modules/media/gallery.service";
import { revalidatePublicGallery } from "@/modules/media/public-gallery";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.MEDIA_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Gallery item ID is required");

    const existing = await prisma.gallery.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Gallery item not found");

    const input = updateGallerySchema.parse(await request.json());
    const updated = await updateGalleryItem(id, input);

    // Audit events follow the existing convention: a specific event for the
    // two admin-visible toggles, a generic update otherwise.
    const driveChanged =
      input.driveUrl !== undefined && (input.driveUrl ?? null) !== existing.driveUrl;
    const activated = input.isPublished === true && !existing.isPublished;
    const deactivated = input.isPublished === false && existing.isPublished;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "media",
      entityId: id,
      entityType: "Gallery",
      details: {
        event: activated
          ? "GALLERY_ITEM_ACTIVATED"
          : deactivated
            ? "GALLERY_ITEM_DEACTIVATED"
            : "GALLERY_ITEM_UPDATED",
        title: updated.title,
        ...(driveChanged ? { event2: "GALLERY_DRIVE_URL_CHANGED", driveUrl: updated.driveUrl } : {}),
        fields: [
          input.title !== undefined && "title",
          input.category !== undefined && "category",
          input.description !== undefined && "description",
          input.imageUrl !== undefined && "imageUrl",
          input.driveUrl !== undefined && "driveUrl",
          input.sortOrder !== undefined && "sortOrder",
          input.isPublished !== undefined && "isPublished",
        ].filter(Boolean),
        previousValues: {
          driveUrl: existing.driveUrl,
          sortOrder: existing.sortOrder,
          isPublished: existing.isPublished,
        },
        newValues: {
          driveUrl: updated.driveUrl,
          sortOrder: updated.sortOrder,
          isPublished: updated.isPublished,
        },
      },
    });

    revalidatePublicGallery();

    return jsonSuccess(
      {
        id: updated.id,
        title: updated.title,
        driveUrl: updated.driveUrl,
        sortOrder: updated.sortOrder,
        isPublished: updated.isPublished,
      },
      requestId,
      `Gallery item "${updated.title}" updated`
    );
  },
  { module: "admin-gallery", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.MEDIA_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Gallery item ID is required");

    const existing = await prisma.gallery.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Gallery item not found");

    await deleteGalleryItem(id);

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "media",
      entityId: id,
      entityType: "Gallery",
      details: {
        event: "GALLERY_ITEM_DELETED",
        title: existing.title,
        slug: existing.slug,
        category: existing.category,
      },
    });

    revalidatePublicGallery();

    return jsonSuccess({ id, deleted: true }, requestId, `Gallery item "${existing.title}" deleted`);
  },
  { module: "admin-gallery", requireCsrf: true }
);
