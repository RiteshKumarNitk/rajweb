import prisma from "@/infrastructure/database/prisma";
import type { OrgScope } from "@/security/rbac/org-scope";

export interface StateOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StateView {
  /** Scope to build queries with: the caller's scope, narrowed by the filter for GLOBAL users. */
  viewScope: OrgScope;
  /** States a GLOBAL user can filter by (empty for scoped users — they get no picker). */
  states: StateOption[];
  /** Currently selected filter state (GLOBAL users only). */
  selectedStateId: string | null;
  /** Human label for the page's scope badge. */
  scopeLabel: string;
}

/**
 * The Super Admin "All States / State A / …" filter.
 *
 * This is a DISPLAY choice only: for GLOBAL users a valid `?state=` narrows
 * what the page shows; it never changes authorization. For STATE/DISTRICT
 * users the param is ignored entirely — they always see exactly their scope.
 * States come from the database; nothing here knows any state by name.
 */
export async function getStateView(scope: OrgScope, requestedStateId?: string | string[] | null): Promise<StateView> {
  const requested = typeof requestedStateId === "string" && requestedStateId ? requestedStateId : null;

  if (scope.level !== "GLOBAL") {
    let scopeLabel = "No scope assigned";
    if (scope.level === "STATE" || scope.level === "DISTRICT") {
      const [state, district] = await Promise.all([
        scope.stateId ? prisma.state.findUnique({ where: { id: scope.stateId }, select: { name: true } }) : null,
        scope.level === "DISTRICT"
          ? prisma.district.findUnique({ where: { id: scope.districtId }, select: { name: true } })
          : null,
      ]);
      scopeLabel =
        scope.level === "STATE"
          ? `State: ${state?.name ?? "Unknown"}`
          : `District: ${district?.name ?? "Unknown"}${state ? ` (${state.name})` : ""}`;
    }
    return { viewScope: scope, states: [], selectedStateId: null, scopeLabel };
  }

  const states = await prisma.state.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isActive: true },
  });
  const selected = requested ? states.find((s) => s.id === requested) ?? null : null;

  return {
    viewScope: selected ? { level: "STATE", stateId: selected.id } : scope,
    states,
    selectedStateId: selected?.id ?? null,
    scopeLabel: selected ? `All States → ${selected.name}` : "All States",
  };
}
