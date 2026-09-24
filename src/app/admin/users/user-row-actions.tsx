"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export type RoleOption = { id: string; name: string; slug: string };
export type DistrictOption = { id: string; name: string };

export interface UserRowActionsProps {
  userId: string;
  isActive: boolean;
  currentRoleId: string;
  currentDistrictId: string | null;
  currentIsFederationWide: boolean;
  roles: RoleOption[];
  districts: DistrictOption[];
}

async function postAction(userId: string, action: string, body?: Record<string, unknown>) {
  const res = await apiFetch(`/api/admin/users/${userId}/${action}`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleApiFetch(res);
}

export function UserRowActions({
  userId,
  isActive,
  currentRoleId,
  currentDistrictId,
  currentIsFederationWide,
  roles,
  districts,
}: UserRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleId, setRoleId] = useState(currentRoleId);
  const [districtId, setDistrictId] = useState(currentDistrictId ?? "");
  const [federationWide, setFederationWide] = useState(currentIsFederationWide);

  async function handleToggleActive() {
    setToggling(true);
    try {
      const { message } = await postAction(userId, isActive ? "deactivate" : "activate");
      toast.success(message ?? "Updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setToggling(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (roleId !== currentRoleId) {
        await postAction(userId, "assign-role", { roleId });
      }
      if (districtId !== (currentDistrictId ?? "")) {
        if (districtId) {
          await postAction(userId, "assign-district", { districtId });
        } else {
          await postAction(userId, "remove-district");
        }
      }
      if (federationWide !== currentIsFederationWide) {
        await postAction(userId, "toggle-federation-wide");
      }
      toast.success("User updated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Manage
      </Button>
      <Button variant="ghost" size="sm" disabled={toggling} onClick={handleToggleActive}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle>Manage User</CardTitle>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <select
                  id="district"
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                >
                  <option value="">No district</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={federationWide}
                  onChange={(e) => setFederationWide(e.target.checked)}
                />
                <span>
                  Federation-wide access
                  <span className="block text-xs text-slate-500">
                    Grants access to all districts regardless of the district above. A district-scoped role with
                    no district and no federation-wide grant sees zero district data.
                  </span>
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
