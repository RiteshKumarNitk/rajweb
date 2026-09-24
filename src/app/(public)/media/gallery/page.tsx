import type { Metadata } from "next";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { MediaImage } from "@/shared/components/ui/media-image";
import { siteImages } from "@/shared/config/site";
import { GalleryGrid } from "./gallery-grid";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description:
    "Photo gallery featuring racquetball tournaments, training camps, and events organized by the Rajasthan Racquetball Association.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Media"
        title="Photo Gallery"
        description="Capturing the spirit of racquetball across Rajasthan — tournaments, training, and community events."
      />
      <PageContent>
        <GalleryGrid images={siteImages.gallery} />
      </PageContent>
    </>
  );
}
