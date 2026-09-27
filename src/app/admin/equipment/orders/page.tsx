import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { directOwnedWhere, districtWhere } from "@/security/rbac/org-scope";
import prisma from "@/infrastructure/database/prisma";
import { getStateView } from "@/modules/states/state-view.server";
import { StateFilter } from "@/shared/components/admin/state-filter";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatInrHelper } from "@/lib/format";
import { AdminOrderStatusControl } from "./order-status-control";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING_PAYMENT", "PAID", "COMPLETED", "CANCELLED"] as const;

interface Filters {
  state?: string;
  /** District id, or "central" for RRA central-store orders. */
  district?: string;
  status?: string;
}

function storeName(order: { state: { name: string } | null; district: { name: string } | null }): string {
  if (order.district) return order.state ? `${order.district.name}, ${order.state.name}` : order.district.name;
  return order.state ? `${order.state.name} (state store)` : "RRA Central Store";
}

export default async function AdminEquipmentOrdersPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { user, scope } = await requireAdminScope(PERMISSIONS.EQUIPMENT_READ);
  const filters = await searchParams;
  const { viewScope, states, selectedStateId, scopeLabel } = await getStateView(scope, filters.state);
  const canManage = hasPermission(user, PERMISSIONS.EQUIPMENT_MANAGE);

  // Scope is always ANDed in — filters can only narrow what the viewer may see.
  const where: Prisma.EquipmentPurchaseOrderWhereInput = {
    AND: [
      directOwnedWhere(viewScope),
      filters.district === "central"
        ? { stateId: null, districtId: null }
        : filters.district
          ? { districtId: filters.district }
          : {},
      STATUSES.includes(filters.status as (typeof STATUSES)[number])
        ? { status: filters.status as (typeof STATUSES)[number] }
        : {},
    ],
  };

  const [orders, districts] = await Promise.all([
    prisma.equipmentPurchaseOrder
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          user: { select: { name: true, email: true } },
          items: true,
          state: { select: { name: true } },
          district: { select: { name: true } },
        },
      })
      .catch(() => []),
    prisma.district
      .findMany({
        where: districtWhere(viewScope),
        orderBy: [{ state: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, state: { select: { name: true } } },
      })
      .catch(() => []),
  ]);

  const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Equipment Orders</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{scopeLabel}</span>
          </div>
          <p className="text-sm text-slate-500">
            Orders placed with the stores in your scope. Payment status changes only through server-side payment
            verification — fulfilment status is managed here.
          </p>
        </div>
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
          Status
          <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm">
          Apply
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={selectedStateId ? `/admin/equipment/orders?state=${selectedStateId}` : "/admin/equipment/orders"}>Reset</Link>
        </Button>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          No equipment orders match.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                <div>
                  <p className="font-bold text-primary">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">
                    {order.user.name} · {order.user.email} · {formatDate(order.createdAt)}
                  </p>
                  <p className="text-xs font-medium text-slate-600">Store: {storeName(order)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={order.paymentStatus === "PAID" ? "ACTIVE" : order.paymentStatus === "FAILED" ? "REJECTED" : "PENDING"}
                    label={`Payment: ${order.paymentStatus}`}
                  />
                  <StatusBadge
                    status={order.status === "COMPLETED" || order.status === "PAID" ? "ACTIVE" : order.status === "CANCELLED" ? "REJECTED" : "PENDING"}
                    label={order.status}
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{item.productNameSnapshot}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} × {formatInrHelper(item.unitPriceSnapshot)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-800">{formatInrHelper(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                <span className="text-sm text-slate-600">
                  Total <strong className="text-base text-primary">{formatInrHelper(order.total)}</strong>
                </span>
                {canManage && <AdminOrderStatusControl orderId={order.id} currentStatus={order.status} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
