import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";

/** Active items of active stores only. */
const ACTIVE_STORE: Prisma.EquipmentItemWhereInput = {
  isActive: true,
  AND: [
    { OR: [{ stateId: null }, { state: { isActive: true } }] },
    { OR: [{ districtId: null }, { district: { isActive: true } }] },
  ],
};

/** RRA central store (no state, no district) — the common catalog anyone may see. */
const CENTRAL_STORE: Prisma.EquipmentItemWhereInput = { stateId: null, districtId: null };

/**
 * What a member may see and buy: the RRA central store, their own state's
 * state-level store, and their own district's store — never another
 * district's or another state's inventory. Without a home district: central only.
 */
export function memberEquipmentWhere(home: { stateId: string | null; districtId: string | null }): Prisma.EquipmentItemWhereInput {
  const stores: Prisma.EquipmentItemWhereInput[] = [CENTRAL_STORE];
  if (home.stateId) stores.push({ stateId: home.stateId, districtId: null });
  if (home.districtId) stores.push({ districtId: home.districtId });
  return { ...ACTIVE_STORE, OR: stores };
}

export const catalogItemSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  description: true,
  image: true,
  sku: true,
  specifications: true,
  category: true,
  price: true,
  stockQuantity: true,
  stateId: true,
  districtId: true,
  state: { select: { name: true } },
  district: { select: { name: true } },
} satisfies Prisma.EquipmentItemSelect;

/** The member's own catalog (server-side scope; not cached — it is per member). */
export function getMemberCatalog(home: { stateId: string | null; districtId: string | null }) {
  return prisma.equipmentItem.findMany({
    where: memberEquipmentWhere(home),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: catalogItemSelect,
  });
}

async function loadCatalog() {
  // Public page: the common (central) catalog only. District inventories are
  // shown to signed-in members of that district in /account/equipment.
  return prisma.equipmentItem.findMany({
    where: { ...ACTIVE_STORE, ...CENTRAL_STORE },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: catalogItemSelect,
  });
}

const getCachedCatalog = unstable_cache(loadCatalog, ["public-equipment-list-central"], {
  revalidate: 60,
  tags: ["public-equipment"],
});

export function getPublicEquipment() {
  return getCachedCatalog();
}

async function loadItemBySlug(slug: string) {
  return prisma.equipmentItem.findFirst({
    where: { slug, ...ACTIVE_STORE, ...CENTRAL_STORE },
    select: catalogItemSelect,
  });
}

const getCachedItem = unstable_cache(loadItemBySlug, ["public-equipment-item-central"], {
  revalidate: 60,
  tags: ["public-equipment"],
});

export const getPublicEquipmentBySlug = cache(async (slug: string) => getCachedItem(slug));
