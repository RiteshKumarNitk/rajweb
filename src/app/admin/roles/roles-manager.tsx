"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { RoleFormModal, type PermissionOption } from "./role-form-modal";

export type RoleRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
  permissionCount: number;
};

type ModalState = { mode: "create" } | { mode: "edit"; role: RoleRow } | null;

export function RolesManager({
  roles,
  permissionsByModule,
}: {
  roles: RoleRow[];
  permissionsByModule: Record<string, PermissionOption[]>;
}) {
  const [modal, setModal] = useState<ModalState>(null);

  const columns: ColumnDef<RoleRow>[] = [
    { header: "Name", accessorKey: "name", className: "font-medium" },
    { header: "Slug", cell: (r) => <code className="text-xs text-slate-500">{r.slug}</code> },
    { header: "Description", cell: (r) => r.description || "—" },
    { header: "Permissions", cell: (r) => `${r.permissionCount} granted` },
    {
      header: "Type",
      cell: (r) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            r.isSystem ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700"
          }`}
        >
          {r.isSystem ? "Built-in" : "Custom"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (r) =>
        r.isSystem ? (
          <span className="text-xs text-slate-400">Protected</span>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setModal({ mode: "edit", role: r })}>
            Edit Permissions
          </Button>
        ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal({ mode: "create" })}>Create Role</Button>
      </div>

      <DataTable data={roles} columns={columns} keyExtractor={(r) => r.id} emptyTitle="No roles found" />

      {modal?.mode === "create" && (
        <RoleFormModal
          mode="create"
          initialPermissionIds={[]}
          permissionsByModule={permissionsByModule}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "edit" && (
        <RoleFormModal
          mode="edit"
          roleId={modal.role.id}
          initialName={modal.role.name}
          initialDescription={modal.role.description ?? ""}
          initialPermissionIds={modal.role.permissionIds}
          permissionsByModule={permissionsByModule}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
