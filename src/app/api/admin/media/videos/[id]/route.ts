import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { mediaVideoUpdateSchema, updateMediaVideo, deleteMediaVideo } from "@/modules/media/media-video.service";
import { revalidatePublicVideos } from "@/modules/equipment/public-equipment";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.VIDEOS_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Video ID is required");

    const existing = await prisma.mediaVideo.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Video not found");

    const input = mediaVideoUpdateSchema.parse(await request.json());
    const updated = await updateMediaVideo(id, input);

    const urlChanged =
      input.youtubeUrl !== undefined && updated.youtubeVideoId !== existing.youtubeVideoId;
    const activated = input.isActive === true && !existing.isActive;
    const deactivated = input.isActive === false && existing.isActive;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "media",
      entityId: id,
      entityType: "MediaVideo",
      details: {
        event: activated
          ? "MEDIA_VIDEO_ACTIVATED"
          : deactivated
            ? "MEDIA_VIDEO_DEACTIVATED"
            : "MEDIA_VIDEO_UPDATED",
        title: updated.title,
        ...(urlChanged ? { event2: "MEDIA_VIDEO_URL_CHANGED", youtubeVideoId: updated.youtubeVideoId } : {}),
      },
    });

    revalidatePublicVideos();

    return jsonSuccess(
      { id, isActive: updated.isActive, youtubeVideoId: updated.youtubeVideoId },
      requestId,
      `Video "${updated.title}" updated`
    );
  },
  { module: "admin-media-videos", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.VIDEOS_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Video ID is required");

    const existing = await prisma.mediaVideo.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Video not found");

    await deleteMediaVideo(id);

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "media",
      entityId: id,
      entityType: "MediaVideo",
      details: { event: "MEDIA_VIDEO_DELETED", title: existing.title },
    });

    revalidatePublicVideos();

    return jsonSuccess({ id, deleted: true }, requestId, `Video "${existing.title}" deleted`);
  },
  { module: "admin-media-videos", requireCsrf: true }
);
