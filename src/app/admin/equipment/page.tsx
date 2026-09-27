import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { fromUnknownError } from "@/core/errors/app-error";
import { EquipmentManager } from "./equipment-manager";

export const dynamic = "force-dynamic";

export default async function AdminEquipmentPage() {
  const { user } = await requireAdminScope(PERMISSIONS.EQUIPMENT_READ);

  let items: Awaited<ReturnType<typeof prisma.equipmentItem.findMany>> = [];
  // Surface load failures (e.g. the equipment tables were never created on
  // this database) instead of rendering an empty catalog that hides them.
  let loadError: string | null = null;
  try {
    items = await prisma.equipmentItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    loadError = fromUnknownError(error).message;
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
    <>
      {loadError && (
        <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Equipment could not be loaded: {loadError}
        </div>
      )}
      <EquipmentManager items={rows} canManage={hasPermission(user, PERMISSIONS.EQUIPMENT_MANAGE)} />
    </>
  );
}
