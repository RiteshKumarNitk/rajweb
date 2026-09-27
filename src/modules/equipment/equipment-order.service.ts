import prisma from "@/infrastructure/database/prisma";
import { createModuleLogger } from "@/core/logger";
import { sanitizePhone, sanitizeText } from "@/security/sanitize";

const log = createModuleLogger("equipment");

export interface CreateEquipmentOrderInput {
  name: string;
  mobile: string;
  address: string;
  district: string;
  equipment: string;
}

export async function createEquipmentOrder(input: CreateEquipmentOrderInput) {
  const order = await prisma.equipmentOrder.create({
    data: {
      name: sanitizeText(input.name),
      mobile: sanitizePhone(input.mobile),
      address: sanitizeText(input.address),
      district: sanitizeText(input.district),
      equipment: sanitizeText(input.equipment),
    },
  });

  log.info({ orderId: order.id, equipment: order.equipment }, "Equipment order created");
  return order;
}

/**
 * `districtNames` scopes the list for state/district-scoped admins (undefined
 * = everything). EquipmentOrder stores the district as free text from the
 * public form, so scoping matches names; an empty list matches nothing.
 */
export async function listEquipmentOrders(districtNames?: string[]) {
  return prisma.equipmentOrder.findMany({
    where:
      districtNames === undefined
        ? undefined
        : { OR: districtNames.length ? districtNames.map((name) => ({ district: { equals: name, mode: "insensitive" as const } })) : [{ id: "__none__" }] },
    orderBy: { createdAt: "desc" },
  });
}
