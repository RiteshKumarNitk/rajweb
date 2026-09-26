import type { Metadata } from "next";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { siteImages } from "@/shared/config/site";
import { getPublishedGalleryItems, type PublicGalleryItem } from "@/modules/media/public-gallery";
import { GalleryGrid } from "./gallery-grid";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description:
    "Photo gallery featuring racquetball tournaments, training camps, and events organized by the Rajasthan Racquetball Association.",
};

/** Static fallback shape = the original page's data contract, unchanged. */
type StaticGalleryItem = {
  title: string;
  src: string;
  category?: string;
  description?: string;
  driveUrl?: string;
};

export default async function GalleryPage() {
  let dbItems: PublicGalleryItem[] = [];
  try {
    dbItems = await getPublishedGalleryItems();
  } catch {
    // Database unavailable — fall back to the static site imagery below.
    dbItems = [];
  }

  const items: StaticGalleryItem[] =
    dbItems.length > 0
      ? dbItems.map((item) => ({
          title: item.title,
          src: item.imageUrl,
          category: item.category ?? undefined,
          description: item.description ?? undefined,
          driveUrl: item.driveUrl ?? undefined,
        }))
      : siteImages.gallery;

  return (
    <>
      <PageHeader
        eyebrow="Media"
        title="Photo Gallery"
        description="Capturing the spirit of racquetball across Rajasthan — tournaments, training, and community events."
      />
      <PageContent>
        <GalleryGrid images={items} />
      </PageContent>
    </>
  );
}
