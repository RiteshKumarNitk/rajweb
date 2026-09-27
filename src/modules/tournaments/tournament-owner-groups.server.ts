import prisma from "@/infrastructure/database/prisma";
import { districtWhere, stateWhere, type OrgScope } from "@/security/rbac/org-scope";
import type { OwnerGroup } from "@/shared/components/admin/tournament-owner-options";

/**
 * States/districts the caller may assign a tournament to — always from the
 * caller's real scope (never the Super Admin display filter). Inactive
 * districts are omitted except `keepDistrictId` (the tournament's current one).
 */
export async function getTournamentOwnerGroups(scope: OrgScope, keepDistrictId?: string | null): Promise<OwnerGroup[]> {
  const states = await prisma.state.findMany({
    where: stateWhere(scope),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      districts: {
        where: {
          ...districtWhere(scope),
          OR: [{ isActive: true }, ...(keepDistrictId ? [{ id: keepDistrictId }] : [])],
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
    },
  });
  return states.map((s) => ({ stateId: s.id, stateName: s.name, districts: s.districts }));
}
