import { cache } from "react";
import { unstable_cache } from "next/cache";
import prisma from "@/infrastructure/database/prisma";

async function loadCatalog() {
  return prisma.equipmentItem.findMany({
    // Active items of active stores: central (no state), or a state/district
    // that is itself active. Each item carries its store for the public label.
    where: {
      isActive: true,
      AND: [
        { OR: [{ stateId: null }, { state: { isActive: true } }] },
        { OR: [{ districtId: null }, { district: { isActive: true } }] },
      ],
    },
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
      state: { select: { name: true } },
      district: { select: { name: true } },
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
    where: {
      slug,
      isActive: true,
      AND: [
        { OR: [{ stateId: null }, { state: { isActive: true } }] },
        { OR: [{ districtId: null }, { district: { isActive: true } }] },
      ],
    },
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
      state: { select: { name: true } },
      district: { select: { name: true } },
    },
  });
}

const getCachedItem = unstable_cache(loadItemBySlug, ["public-equipment-item"], {
  revalidate: 60,
  tags: ["public-equipment"],
});

export const getPublicEquipmentBySlug = cache(async (slug: string) => getCachedItem(slug));
