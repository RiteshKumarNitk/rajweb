import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import prisma from "@/infrastructure/database/prisma";

/** Clears the public gallery page cache after any admin gallery change. */
export function revalidatePublicGallery() {
  revalidateTag("public-gallery", { expire: 0 });
  revalidatePath("/media/gallery");
}

export interface PublicGalleryItem {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  imageUrl: string;
  driveUrl: string | null;
}

async function loadPublishedGalleryItems(): Promise<PublicGalleryItem[]> {
  const rows = await prisma.gallery.findMany({
    where: { isPublished: true, imageUrl: { not: null } },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      imageUrl: true,
      driveUrl: true,
      sortOrder: true,
      createdAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return rows
    .filter((row): row is typeof row & { imageUrl: string } => row.imageUrl !== null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      imageUrl: row.imageUrl,
      driveUrl: row.driveUrl,
    }));
}

const getCachedPublishedGalleryItems = unstable_cache(loadPublishedGalleryItems, ["public-gallery-list"], {
  revalidate: 60,
  tags: ["public-gallery"],
});

export function getPublishedGalleryItems() {
  return getCachedPublishedGalleryItems();
}
