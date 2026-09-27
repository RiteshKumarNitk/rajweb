import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { VideoManager, type VideoRow } from "./video-manager";

export const dynamic = "force-dynamic";

export default async function AdminMediaVideosPage() {
  const { user } = await requireAdminScope(PERMISSIONS.MEDIA_READ);
  // hasPermission, not a raw permissions.includes(): Super Admin is granted
  // everything by the RBAC layer even when a permission row has not been
  // seeded into its role yet. The API enforces videos:manage the same way.
  const canManage = hasPermission(user, PERMISSIONS.VIDEOS_MANAGE);

  let rows: VideoRow[] = [];
  try {
    const videos = await prisma.mediaVideo.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    rows = videos.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      youtubeUrl: v.youtubeUrl,
      youtubeVideoId: v.youtubeVideoId,
      category: v.category,
      sortOrder: v.sortOrder,
      isActive: v.isActive,
      updatedAt: v.updatedAt.toISOString(),
    }));
  } catch {
    rows = [];
  }

  return <VideoManager items={rows} canManage={canManage} />;
}
