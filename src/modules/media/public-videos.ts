import { unstable_cache } from "next/cache";
import prisma from "@/infrastructure/database/prisma";

export interface PublicVideo {
  id: string;
  title: string;
  description: string | null;
  youtubeVideoId: string;
  youtubeUrl: string;
  category: string | null;
}

async function loadActiveVideos(): Promise<PublicVideo[]> {
  return prisma.mediaVideo.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      youtubeVideoId: true,
      youtubeUrl: true,
      category: true,
    },
  });
}

const getCachedVideos = unstable_cache(loadActiveVideos, ["public-videos-list"], {
  revalidate: 60,
  tags: ["public-videos"],
});

export function getPublicVideos() {
  return getCachedVideos();
}
