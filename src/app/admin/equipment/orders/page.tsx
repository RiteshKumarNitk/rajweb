import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { directOwnedWhere, districtWhere } from "@/security/rbac/org-scope";
import prisma from "@/infrastructure/database/prisma";
import { getStateView } from "@/modules/states/state-view.server";
import { StateFilter } from "@/shared/components/admin/state-filter";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { OrderStatusBadge, PaymentStatusBadge, TestPaymentBadge } from "@/shared/components/equipment/order-badges";
import { formatDate } from "@/lib/utils";
import { formatInrHelper } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, storeLabel } from "@/modules/equipment/order-status";
import { allowedNextStatuses } from "@/modules/equipment/purchase.service";
import { AdminOrderStatusControl } from "./order-status-control";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING_PAYMENT", "PLACED", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"] as const;
const PAGE_SIZE = 20;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

interface Filters {
  state?: string;
  /** District id, or "central" for RRA central-store orders. */
  district?: string;
  status?: string;
  payment?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: string;
}

export default async function AdminEquipmentOrdersPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { user, scope } = await requireAdminScope(PERMISSIONS.EQUIPMENT_READ);
  const filters = await searchParams;
  const { viewScope, states, selectedStateId, scopeLabel } = await getStateView(scope, filters.state);
  const canManage = hasPermission(user, PERMISSIONS.EQUIPMENT_MANAGE);
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const q = filters.q?.trim();
  const from = filters.from && DATE_ONLY.test(filters.from) ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
  const to = filters.to && DATE_ONLY.test(filters.to) ? new Date(`${filters.to}T00:00:00.000Z`) : undefined;
  if (to) to.setUTCDate(to.getUTCDate() + 1);

  // Scope is always ANDed in — filters can only narrow what the viewer may see.
  const where: Prisma.EquipmentPurchaseOrderWhereInput = {
    AND: [
      directOwnedWhere(viewScope),
      filters.district === "central" ? { stateId: null, districtId: null } : filters.district ? { districtId: filters.district } : {},
      STATUSES.includes(filters.status as (typeof STATUSES)[number])
        ? filters.status === "PLACED"
          ? { status: { in: ["PLACED", "PAID"] } }
          : filters.status === "DELIVERED"
            ? { status: { in: ["DELIVERED", "COMPLETED"] } }
            : { status: filters.status as (typeof STATUSES)[number] }
        : {},
      PAYMENT_STATUSES.includes(filters.payment as (typeof PAYMENT_STATUSES)[number]) ? { paymentStatus: filters.payment as (typeof PAYMENT_STATUSES)[number] } : {},
      q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { buyerName: { contains: q, mode: "insensitive" } },
              { buyerPhone: { contains: q } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
      from ? { createdAt: { gte: from } } : {},
      to ? { createdAt: { lt: to } } : {},
    ],
  };

  const [total, orders, districts] = await Promise.all([
    prisma.equipmentPurchaseOrder.count({ where }),
    prisma.equipmentPurchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { productNameSnapshot: true, quantity: true } },
        payments: { select: { isTest: true } },
        state: { select: { name: true } },
        district: { select: { name: true } },
      },
    }),
    prisma.district.findMany({
      where: districtWhere(viewScope),
      orderBy: [{ state: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, state: { select: { name: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-2 text-sm";
  const pageHref = (p: number) => {
    const params = new URLSearchParams(Object.entries({ ...filters, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/admin/equipment/orders?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Equipment Orders</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{scopeLabel}</span>
          </div>
          <p className="text-sm text-slate-500">
            Orders for the stores in your scope. Payment status changes only through server-side payment verification;
            fulfilment moves one step at a time and only for paid orders.
          </p>
        </div>
        <StateFilter states={states} selectedStateId={selectedStateId} />
      </div>

      <form method="get" className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {selectedStateId && <input type="hidden" name="state" value={selectedStateId} />}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Search
          <Input name="q" defaultValue={filters.q ?? ""} placeholder="Order number, member name, email, phone" className="h-9" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Store
          <select name="district" defaultValue={filters.district ?? ""} className={selectClass}>
            <option value="">All in scope</option>
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
          Order status
          <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Payment
          <select name="payment" defaultValue={filters.payment ?? ""} className={selectClass}>
            <option value="">Any</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          From
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          To
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={selectClass} />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-7">
          <Button type="submit" size="sm">Apply</Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={selectedStateId ? `/admin/equipment/orders?state=${selectedStateId}` : "/admin/equipment/orders"}>Reset</Link>
          </Button>
          <span className="ml-auto text-xs text-slate-500">{total} order{total === 1 ? "" : "s"}</span>
        </div>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">No equipment orders match.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/equipment/orders/${order.id}`} className="font-mono text-sm font-bold text-primary hover:underline">
                      {order.orderNumber}
                    </Link>
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                    {order.payments.some((p) => p.isTest) && <TestPaymentBadge />}
                  </div>
                  <p className="text-xs text-slate-500">
                    {order.buyerName ?? order.user.name} · {order.buyerEmail ?? order.user.email} · {formatDate(order.createdAt)} · Store: {storeLabel(order)}
                  </p>
                  <p className="truncate text-sm text-slate-700">{order.items.map((i) => `${i.productNameSnapshot} × ${i.quantity}`).join(", ")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <span className="text-base font-bold text-primary">{formatInrHelper(order.total)}</span>
                  {canManage && <AdminOrderStatusControl orderId={order.id} nextStatuses={allowedNextStatuses(order.status)} />}
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/admin/equipment/orders/${order.id}`}>Details</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
              <span className="text-slate-500">Page {page} of {pages}</span>
              <div className="flex gap-2">
                {page > 1 && <Button size="sm" variant="outline" asChild><Link href={pageHref(page - 1)}>Previous</Link></Button>}
                {page < pages && <Button size="sm" variant="outline" asChild><Link href={pageHref(page + 1)}>Next</Link></Button>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
