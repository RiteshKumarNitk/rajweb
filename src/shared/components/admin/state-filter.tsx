"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { StateOption } from "@/modules/states/state-view.server";

/**
 * Super Admin state filter. Rendered only when the server passes states
 * (GLOBAL users). Changing it only updates `?state=`; the server re-scopes
 * the query — nothing is filtered client-side.
 */
export function StateFilter({ states, selectedStateId }: { states: StateOption[]; selectedStateId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (states.length === 0) return null;

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("state", value);
    else params.delete("state");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      State
      <select
        value={selectedStateId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
      >
        <option value="">All States</option>
        {states.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.isActive ? "" : " (inactive)"}
          </option>
        ))}
      </select>
    </label>
  );
}
