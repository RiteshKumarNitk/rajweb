import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { listEquipmentOrders } from "@/modules/equipment/equipment-order.service";
import { formatDate } from "@/lib/utils";

import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";

export const dynamic = "force-dynamic";

type EquipmentOrder = Awaited<ReturnType<typeof listEquipmentOrders>>[number];

export default async function EquipmentOrdersPage() {
  let orders: EquipmentOrder[] = [];

  try {
    orders = await listEquipmentOrders();
  } catch {
    orders = [];
  }

  const columns: ColumnDef<EquipmentOrder>[] = [
    { header: "Date", cell: (o) => formatDate(o.createdAt), className: "whitespace-nowrap text-slate-600" },
    { header: "Name", accessorKey: "name", className: "font-medium text-primary" },
    { header: "Mobile", accessorKey: "mobile", className: "text-slate-600" },
    { header: "District", accessorKey: "district", className: "text-slate-600" },
    { header: "Equipment", accessorKey: "equipment", className: "text-slate-600" },
    { header: "Address", accessorKey: "address", className: "text-slate-600" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Equipment Orders</h1>
        <p className="text-slate-500">Buy Now requests from the equipment page</p>
      </div>

      <DashboardCard title={`All Orders (${orders.length})`}>
        <DataTable
          data={orders}
          columns={columns}
          keyExtractor={(o) => o.id}
          emptyTitle="No equipment orders yet."
        />
      </DashboardCard>
    </div>
  );
}
