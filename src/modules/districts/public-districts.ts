import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import prisma from "@/infrastructure/database/prisma";

/** Clears the public districts page cache after any admin district change. */
export function revalidatePublicDistricts() {
  revalidateTag("public-districts", { expire: 0 });
  revalidatePath("/districts");
}

async function loadActiveDistricts(): Promise<PublicDistrict[]> {
  return prisma.district.findMany({
    // Active districts of active states only, in the admin-defined order.
    where: { isActive: true, state: { isActive: true } },
    select: {
      id: true,
      name: true,
      slug: true,
      state: { select: { id: true, name: true } },
      president: true,
      secretary: true,
      email: true,
      phone: true,
      address: true,
    },
    orderBy: [{ state: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

const getCachedActiveDistricts = unstable_cache(loadActiveDistricts, ["public-districts-list"], {
  revalidate: 60,
  tags: ["public-districts"],
});

export function getActiveDistricts() {
  return getCachedActiveDistricts();
}

export interface PublicDistrict {
  id: string;
  name: string;
  slug: string;
  state: { id: string; name: string } | null;
  president: string | null;
  secretary: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}
