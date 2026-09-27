import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { directOwnedWhere, districtWhere } from "@/security/rbac/org-scope";
import prisma from "@/infrastructure/database/prisma";
import { fromUnknownError } from "@/core/errors/app-error";
import { getStateView } from "@/modules/states/state-view.server";
import { getTournamentOwnerGroups } from "@/modules/tournaments/tournament-owner-groups.server";
import { EQUIPMENT_CATEGORIES } from "@/modules/equipment/equipment.service";
import { StateFilter } from "@/shared/components/admin/state-filter";
import { Button } from "@/shared/components/ui/button";
import { EquipmentManager } from "./equipment-manager";

export const dynamic = "force-dynamic";

interface Filters {
  state?: string;
  /** District id, or "central" for the RRA central store. */
  district?: string;
  category?: string;
  active?: string;
  /** "in" | "out" | "low" (≤ 5 left) */
  stock?: string;
}

async function loadItems(where: Prisma.EquipmentItemWhereInput) {
  try {
    const items = await prisma.equipmentItem.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { state: { select: { name: true } }, district: { select: { name: true } } },
    });
    return { items, loadError: null };
  } catch (error) {
    return { items: [], loadError: fromUnknownError(error).message };
  }
}

function storeName(item: { state: { name: string } | null; district: { name: string } | null }): string {
  if (item.district) return item.state ? `${item.district.name}, ${item.state.name}` : item.district.name;
  return item.state ? `${item.state.name} (state store)` : "RRA Central Store";
}

export default async function AdminEquipmentPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { user, scope } = await requireAdminScope(PERMISSIONS.EQUIPMENT_READ);
  const filters = await searchParams;
  const { viewScope, states, selectedStateId, scopeLabel } = await getStateView(scope, filters.state);
  const canManage = hasPermission(user, PERMISSIONS.EQUIPMENT_MANAGE);

  // Scope first, then display filters — a filter can never widen the scope.
  const where: Prisma.EquipmentItemWhereInput = {
    AND: [
      directOwnedWhere(viewScope),
      filters.district === "central"
        ? { stateId: null, districtId: null }
        : filters.district
          ? { districtId: filters.district }
          : {},
      (EQUIPMENT_CATEGORIES as readonly string[]).includes(filters.category ?? "")
        ? { category: filters.category as (typeof EQUIPMENT_CATEGORIES)[number] }
        : {},
      filters.active === "active" ? { isActive: true } : filters.active === "inactive" ? { isActive: false } : {},
      filters.stock === "out"
        ? { stockQuantity: { lt: 1 } }
        : filters.stock === "low"
          ? { stockQuantity: { gte: 1, lte: 5 } }
          : filters.stock === "in"
            ? { stockQuantity: { gte: 1 } }
            : {},
    ],
  };

  // Surface load failures (e.g. the equipment tables were never created on
  // this database) instead of rendering an empty catalog that hides them.
  const { items, loadError } = await loadItems(where);

  const [districts, ownerGroups] = await Promise.all([
    prisma.district
      .findMany({
        where: districtWhere(viewScope),
        orderBy: [{ state: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, state: { select: { name: true } } },
      })
      .catch(() => []),
    canManage ? getTournamentOwnerGroups(scope).catch(() => []) : Promise.resolve([]),
  ]);

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
    stateId: item.stateId,
    districtId: item.districtId,
    storeName: storeName(item),
  }));

  const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-2 text-sm";

  return (
    <div className="space-y-4">
      {loadError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Equipment could not be loaded: {loadError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{scopeLabel}</span>
        <StateFilter states={states} selectedStateId={selectedStateId} />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {selectedStateId && <input type="hidden" name="state" value={selectedStateId} />}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Store
          <select name="district" defaultValue={filters.district ?? ""} className={selectClass}>
            <option value="">All stores in scope</option>
            {scope.level === "GLOBAL" && <option value="central">RRA Central Store</option>}
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.state ? ` (${d.state.name})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Category
          <select name="category" defaultValue={filters.category ?? ""} className={selectClass}>
            <option value="">All</option>
            {EQUIPMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Status
          <select name="active" defaultValue={filters.active ?? ""} className={selectClass}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Stock
          <select name="stock" defaultValue={filters.stock ?? ""} className={selectClass}>
            <option value="">Any</option>
            <option value="in">In stock</option>
            <option value="low">Low (1–5)</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
        <Button type="submit" size="sm">
          Apply
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={selectedStateId ? `/admin/equipment?state=${selectedStateId}` : "/admin/equipment"}>Reset</Link>
        </Button>
      </form>

      <EquipmentManager
        items={rows}
        canManage={canManage}
        ownership={{
          ownerGroups,
          allowCentral: scope.level === "GLOBAL",
          lockedDistrictId: scope.level === "DISTRICT" ? scope.districtId : undefined,
        }}
      />
    </div>
  );
}
