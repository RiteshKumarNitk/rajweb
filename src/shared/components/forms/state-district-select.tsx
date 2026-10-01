"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/shared/components/ui/label";

export interface LocationOption {
  id: string;
  name: string;
}

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

async function load(url: string): Promise<LocationOption[]> {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Could not load locations");
  return json.data as LocationOption[];
}

/**
 * State → District picker. Districts are fetched from the server for the
 * chosen state (`/api/locations/districts?stateId=`), so the list can only
 * ever contain that state's districts. Changing the state clears the district.
 */
export function StateDistrictSelect({
  stateId,
  districtId,
  onChange,
  disabled,
}: {
  stateId: string;
  districtId: string;
  onChange: (value: { stateId: string; districtId: string; districtName?: string; stateName?: string }) => void;
  disabled?: boolean;
}) {
  const [states, setStates] = useState<LocationOption[] | null>(null);
  const [districts, setDistricts] = useState<{ stateId: string; items: LocationOption[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    load("/api/locations/states")
      .then((rows) => active && setStates(rows))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!stateId) return;
    let active = true;
    load(`/api/locations/districts?stateId=${encodeURIComponent(stateId)}`)
      .then((rows) => active && setDistricts({ stateId, items: rows }))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [stateId]);

  const districtOptions = districts && districts.stateId === stateId ? districts.items : null;
  const loadingDistricts = !!stateId && !districtOptions && !error;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="home-state">State</Label>
        <select
          id="home-state"
          className={SELECT_CLASS}
          value={stateId}
          disabled={disabled || !states}
          onChange={(e) => {
            const s = states?.find((x) => x.id === e.target.value);
            onChange({ stateId: e.target.value, districtId: "", stateName: s?.name });
          }}
        >
          <option value="">{states ? "Select State" : "Loading states…"}</option>
          {states?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="home-district" className="flex items-center gap-2">
          District {loadingDistricts && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </Label>
        <select
          id="home-district"
          className={SELECT_CLASS}
          value={districtOptions?.some((d) => d.id === districtId) ? districtId : ""}
          disabled={disabled || !stateId || !districtOptions}
          onChange={(e) => {
            const d = districtOptions?.find((x) => x.id === e.target.value);
            onChange({ stateId, districtId: e.target.value, districtName: d?.name });
          }}
        >
          <option value="">{!stateId ? "Select a state first" : loadingDistricts ? "Loading districts…" : "Select District"}</option>
          {districtOptions?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
    </div>
  );
}
