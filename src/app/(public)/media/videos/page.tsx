import type { Metadata } from "next";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { getYoutubeMediaItems, YoutubeVideoCard } from "@/modules/media/components/youtube-video-card";

export const metadata: Metadata = {
  title: "Videos",
  description:
    "Watch racquetball training videos, tournament highlights, and educational content from the Rajasthan Racquetball Association.",
};

export default async function VideosPage() {
  const videos = await getYoutubeMediaItems();

  return (
    <>
      <PageHeader
        eyebrow="Media"
        title="Videos"
        description="Training tutorials, tournament highlights, and educational content for racquetball enthusiasts."
      />
      <PageContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <YoutubeVideoCard key={video.url} item={video} />
          ))}
        </div>
      </PageContent>
    </>
  );
}
