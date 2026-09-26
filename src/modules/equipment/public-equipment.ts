import { revalidatePath, revalidateTag } from "next/cache";

/** Clears equipment catalog caches after admin changes. */
export function revalidateEquipment() {
  revalidateTag("public-equipment", { expire: 0 });
  revalidatePath("/equipment");
}

/** Clears public media-videos cache after admin changes. */
export function revalidatePublicVideos() {
  revalidateTag("public-videos", { expire: 0 });
  revalidatePath("/media/videos");
}
