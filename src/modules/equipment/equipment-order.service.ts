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

export async function listEquipmentOrders() {
  return prisma.equipmentOrder.findMany({
    orderBy: { createdAt: "desc" },
  });
}
