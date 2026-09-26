import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { formatInrHelper } from "@/lib/format";
import { AdminOrderStatusControl } from "./order-status-control";

export const dynamic = "force-dynamic";

export default async function AdminEquipmentOrdersPage() {
  await requireAdminScope(PERMISSIONS.EQUIPMENT_READ);

  type AdminOrder = Awaited<
    ReturnType<typeof prisma.equipmentPurchaseOrder.findMany>
  >[number] & {
    user: { name: string; email: string };
    items: { id: string; productNameSnapshot: string; quantity: number; unitPriceSnapshot: number; lineTotal: number }[];
  };

  let orders: AdminOrder[] = [];
  try {
    orders = await prisma.equipmentPurchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        items: true,
      },
    });
  } catch {
    orders = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Equipment Orders</h1>
        <p className="text-sm text-slate-500">
          Member purchase orders. Payment status changes only through server-side payment verification —
          fulfilment status is managed here.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          No equipment orders yet.
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
                <AdminOrderStatusControl orderId={order.id} currentStatus={order.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
