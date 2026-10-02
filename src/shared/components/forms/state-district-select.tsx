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
 * ever contain that state's districts. Changing the state clears the district,
 * and a single active state (e.g. only Rajasthan) is selected and fixed. The server re-checks
 * that the district belongs to the state on submit.
 */
export function StateDistrictSelect({
  stateId,
  districtId,
  onChange,
  disabled,
  errors,
}: {
  stateId: string;
  districtId: string;
  onChange: (value: { stateId: string; districtId: string; districtName?: string; stateName?: string }) => void;
  disabled?: boolean;
  errors?: { stateId?: string; districtId?: string };
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

  // Only one active state: nothing to choose, so pick it for the member.
  const onlyState = states?.length === 1 ? states[0] : null;
  useEffect(() => {
    if (onlyState && !stateId && !disabled) onChange({ stateId: onlyState.id, districtId: "", stateName: onlyState.name });
  }, [onlyState, stateId, disabled, onChange]);

  const districtOptions = districts && districts.stateId === stateId ? districts.items : null;
  const loadingDistricts = !!stateId && !districtOptions && !error;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="stateId">State</Label>
        <select
          id="stateId"
          name="stateId"
          className={SELECT_CLASS}
          value={stateId}
          disabled={disabled || !states || Boolean(onlyState)}
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
        {errors?.stateId && <p className="text-sm text-secondary">{errors.stateId}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="districtId" className="flex items-center gap-2">
          District {loadingDistricts && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </Label>
        <select
          id="districtId"
          name="districtId"
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
        {errors?.districtId && <p className="text-sm text-secondary">{errors.districtId}</p>}
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
    </div>
  );
}
