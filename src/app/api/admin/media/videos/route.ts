import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { mediaVideoSchema, createMediaVideo } from "@/modules/media/media-video.service";
import { revalidatePublicVideos } from "@/modules/equipment/public-equipment";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.VIDEOS_MANAGE);
    let input;
    try {
      input = mediaVideoSchema.parse(await request.json());
    } catch {
      throw AppError.badRequest("Invalid YouTube URL or video data");
    }

    const video = await createMediaVideo(input);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "media",
      entityId: video.id,
      entityType: "MediaVideo",
      details: {
        event: "MEDIA_VIDEO_CREATED",
        title: video.title,
        youtubeVideoId: video.youtubeVideoId,
      },
    });

    revalidatePublicVideos();

    return jsonSuccess(
      { id: video.id, youtubeVideoId: video.youtubeVideoId },
      requestId,
      `Video "${video.title}" added`
    );
  },
  { module: "admin-media-videos", requireCsrf: true }
);
