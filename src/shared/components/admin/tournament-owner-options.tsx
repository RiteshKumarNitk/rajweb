/**
 * One <select> for "who owns this tournament": grouped by state, each group
 * offering "State-wide" plus that state's districts. Values are encoded as
 * `s:<stateId>` (state-wide) or `d:<districtId>`. The server re-derives and
 * validates ownership from the caller's scope (tournament-ownership.server.ts);
 * this only shows the choices that scope allows.
 */
export interface OwnerGroup {
  stateId: string;
  stateName: string;
  districts: { id: string; name: string }[];
}

export function ownerValue(owner: { stateId: string | null; districtId: string | null }): string {
  if (owner.districtId) return `d:${owner.districtId}`;
  return owner.stateId ? `s:${owner.stateId}` : "";
}

export function parseOwnerValue(value: string | undefined): { stateId?: string; districtId: string | null } | undefined {
  if (!value) return undefined;
  if (value.startsWith("d:")) return { districtId: value.slice(2) };
  if (value.startsWith("s:")) return { stateId: value.slice(2), districtId: null };
  return undefined;
}

export function OwnerOptions({ groups, allowStateWide }: { groups: OwnerGroup[]; allowStateWide: boolean }) {
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.stateId} label={g.stateName}>
          {allowStateWide && <option value={`s:${g.stateId}`}>State-wide — {g.stateName}</option>}
          {g.districts.map((d) => (
            <option key={d.id} value={`d:${d.id}`}>
              {d.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
