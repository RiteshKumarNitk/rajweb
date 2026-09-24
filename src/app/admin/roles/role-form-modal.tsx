"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export type PermissionOption = { id: string; slug: string; name: string; module: string };

interface RoleFormValues {
  name: string;
  description: string;
}

export function RoleFormModal({
  mode,
  roleId,
  initialName,
  initialDescription,
  initialPermissionIds,
  permissionsByModule,
  onClose,
}: {
  mode: "create" | "edit";
  roleId?: string;
  initialName?: string;
  initialDescription?: string;
  initialPermissionIds: string[];
  permissionsByModule: Record<string, PermissionOption[]>;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm<RoleFormValues>({
    defaultValues: { name: initialName ?? "", description: initialDescription ?? "" },
  });
  const [selected, setSelected] = useState<Set<string>>(new Set(initialPermissionIds));
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(data: RoleFormValues) {
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await apiFetch("/api/admin/roles", {
          method: "POST",
          body: JSON.stringify({
            name: data.name,
            description: data.description || undefined,
            permissionIds: Array.from(selected),
          }),
        });
        const { message } = await handleApiFetch(res);
        toast.success(message ?? "Role created");
      } else {
        const res = await apiFetch(`/api/admin/roles/${roleId}`, {
          method: "PATCH",
          body: JSON.stringify({ permissionIds: Array.from(selected) }),
        });
        const { message } = await handleApiFetch(res);
        toast.success(message ?? "Role updated");
      }
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <CardTitle>{mode === "create" ? "Create Role" : `Edit Permissions — ${initialName}`}</CardTitle>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {mode === "create" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input id="name" placeholder="e.g. Certificate Manager" {...register("name", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input id="description" placeholder="What this role is for" {...register("description")} />
                </div>
              </>
            )}

            <div className="space-y-4">
              <Label>Permissions</Label>
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{module}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.has(perm.id)}
                          onChange={() => toggle(perm.id)}
                        />
                        {perm.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : mode === "create" ? "Create Role" : "Save Permissions"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
