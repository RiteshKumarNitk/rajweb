import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { EquipmentManager } from "./equipment-manager";

export const dynamic = "force-dynamic";

export default async function AdminEquipmentPage() {
  await requireAdminScope(PERMISSIONS.EQUIPMENT_READ);

  let items: Awaited<ReturnType<typeof prisma.equipmentItem.findMany>> = [];
  try {
    items = await prisma.equipmentItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch {
    items = [];
  }

  const rows = items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    category: item.category,
    price: item.price,
    stockQuantity: item.stockQuantity,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    image: item.image,
    shortDescription: item.shortDescription,
    description: item.description,
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <EquipmentManager
      items={rows}
      canManage={true}
    />
  );
}
