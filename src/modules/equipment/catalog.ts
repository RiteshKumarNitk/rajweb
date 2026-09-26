import { cache } from "react";
import { unstable_cache } from "next/cache";
import prisma from "@/infrastructure/database/prisma";

async function loadCatalog() {
  return prisma.equipmentItem.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      image: true,
      category: true,
      price: true,
      stockQuantity: true,
    },
  });
}

const getCachedCatalog = unstable_cache(loadCatalog, ["public-equipment-list"], {
  revalidate: 60,
  tags: ["public-equipment"],
});

export function getPublicEquipment() {
  return getCachedCatalog();
}

async function loadItemBySlug(slug: string) {
  return prisma.equipmentItem.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      image: true,
      category: true,
      price: true,
      stockQuantity: true,
    },
  });
}

const getCachedItem = unstable_cache(loadItemBySlug, ["public-equipment-item"], {
  revalidate: 60,
  tags: ["public-equipment"],
});

export const getPublicEquipmentBySlug = cache(async (slug: string) => getCachedItem(slug));
