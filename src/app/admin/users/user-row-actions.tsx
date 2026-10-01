"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, KeyRound, Copy } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export type RoleOption = { id: string; name: string; slug: string };
export type DistrictOption = { id: string; name: string; stateId: string | null };
export type StateOption = { id: string; name: string };

export interface UserRowActionsProps {
  userId: string;
  isActive: boolean;
  currentRoleId: string;
  currentStateId: string | null;
  currentDistrictId: string | null;
  currentIsFederationWide: boolean;
  roles: RoleOption[];
  states: StateOption[];
  districts: DistrictOption[];
  /** Super Admin viewing an e-mail + password account. */
  canResetPassword?: boolean;
}

/** Strong random password generated in the browser (never sent anywhere but the reset call). */
function generatePassword(): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!#%+=?@^_-"];
  const all = sets.join("");
  const random = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = sets.map((set) => set[random(set.length)]);
  while (chars.length < 20) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
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
  currentStateId,
  currentDistrictId,
  currentIsFederationWide,
  roles,
  states,
  districts,
  canResetPassword = false,
}: UserRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleId, setRoleId] = useState(currentRoleId);
  const [stateId, setStateId] = useState(currentStateId ?? "");
  const [districtId, setDistrictId] = useState(currentDistrictId ?? "");
  const stateDistricts = districts.filter((d) => d.stateId === stateId);
  const [federationWide, setFederationWide] = useState(currentIsFederationWide);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleResetPassword() {
    setResetting(true);
    try {
      await postAction(userId, "reset-password", { password: newPassword });
      toast.success("Password reset. Share it with the account holder through a private channel.");
      setNewPassword("");
      setResetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

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
      // State first: assigning a state may clear a district from another state.
      if (stateId !== (currentStateId ?? "")) {
        await postAction(userId, stateId ? "assign-state" : "remove-state", stateId ? { stateId } : undefined);
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
      {canResetPassword && (
        <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
          <KeyRound className="mr-1 h-3.5 w-3.5" /> Reset password
        </Button>
      )}

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle>Reset Password</CardTitle>
              <button
                type="button"
                onClick={() => {
                  setNewPassword("");
                  setResetOpen(false);
                }}
                className="rounded-md p-1 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    type="text"
                    autoComplete="new-password"
                    spellCheck={false}
                    className="font-mono"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11"
                    disabled={!newPassword}
                    onClick={() => navigator.clipboard.writeText(newPassword).then(() => toast.success("Copied"))}
                    aria-label="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  At least 12 characters with upper- and lower-case letters, a digit and a symbol. It is shown only
                  here — copy it before saving; it cannot be viewed again.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setNewPassword(generatePassword())}>
                  Generate strong password
                </Button>
                <Button onClick={handleResetPassword} disabled={resetting || newPassword.length < 12}>
                  {resetting ? "Saving..." : "Set password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={stateId}
                  onChange={(e) => {
                    setStateId(e.target.value);
                    setDistrictId("");
                  }}
                >
                  <option value="">No state</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  State only → State Admin scope (every district of that state). State + district → district scope.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <select
                  id="district"
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  disabled={!stateId}
                >
                  <option value="">No district (whole state)</option>
                  {stateDistricts.map((d) => (
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
                    Grants access to every state and district regardless of the selections above. A scoped role
                    with no state, no district and no federation-wide grant sees no member data.
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
