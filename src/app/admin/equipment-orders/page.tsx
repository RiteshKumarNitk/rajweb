import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { listEquipmentOrders } from "@/modules/equipment/equipment-order.service";
import { formatDate } from "@/lib/utils";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { ShoppingBag, Phone, MapPin, Package, Calendar, User } from "lucide-react";

export const dynamic = "force-dynamic";

type EquipmentOrder = Awaited<ReturnType<typeof listEquipmentOrders>>[number];

export default async function EquipmentOrdersPage() {
  let orders: EquipmentOrder[] = [];

  try {
    orders = await listEquipmentOrders();
  } catch {
    orders = [];
  }

  const totalOrders = orders.length;
  const uniqueDistricts = new Set(orders.map((o) => o.district).filter(Boolean)).size;

  const columns: ColumnDef<EquipmentOrder>[] = [
    {
      header: "Order Date",
      cell: (o) => (
        <span className="text-xs text-slate-600 flex items-center gap-1 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(o.createdAt)}
        </span>
      ),
    },
    {
      header: "Customer Details",
      cell: (o) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{o.name}</p>
          <a
            href={`tel:${o.mobile}`}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-0.5"
          >
            <Phone className="h-3 w-3" /> {o.mobile}
          </a>
        </div>
      ),
    },
    {
      header: "District",
      cell: (o) => (
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
          {o.district || "Rajasthan"}
        </span>
      ),
    },
    {
      header: "Requested Equipment",
      cell: (o) => (
        <span className="font-medium text-xs text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          {o.equipment}
        </span>
      ),
    },
    {
      header: "Delivery Address",
      cell: (o) => (
        <p className="max-w-xs text-xs text-slate-600 line-clamp-2" title={o.address}>
          {o.address}
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Equipment Purchase Orders</h1>
          <p className="text-sm text-slate-500">
            Direct &quot;Buy Now&quot; procurement requests submitted by players, clubs, and schools for official gear.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Gear Inquiries</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalOrders}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Racquets, balls &amp; protective gear</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Districts Served</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{uniqueDistricts}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">Statewide fulfillment</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Fulfillment Unit</p>
                <h3 className="text-sm font-bold text-primary mt-1">Direct Association Supply</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Standardized competition balls &amp; strings</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-primary">All Equipment Orders</CardTitle>
          <CardDescription className="text-xs">
            Review customer contact phone numbers, delivery addresses, and gear specifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={orders}
            columns={columns}
            keyExtractor={(o) => o.id}
            emptyTitle="No equipment orders yet"
            emptyDescription="Equipment inquiries submitted from the public store will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
