import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { createGallerySchema, createGalleryItem } from "@/modules/media/gallery.service";
import { revalidatePublicGallery } from "@/modules/media/public-gallery";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.MEDIA_MANAGE);
    const input = createGallerySchema.parse(await request.json());

    const item = await createGalleryItem(input);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "media",
      entityId: item.id,
      entityType: "Gallery",
      details: {
        event: "GALLERY_ITEM_CREATED",
        title: item.title,
        category: item.category,
        driveUrl: item.driveUrl,
        isPublished: item.isPublished,
        sortOrder: item.sortOrder,
      },
    });

    revalidatePublicGallery();

    return jsonSuccess(
      { id: item.id, title: item.title, slug: item.slug, isPublished: item.isPublished },
      requestId,
      `Gallery item "${item.title}" created`
    );
  },
  { module: "admin-gallery", requireCsrf: true }
);
