import prisma from "@/infrastructure/database/prisma";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { stateWhere } from "@/security/rbac/org-scope";
import { StatesManager, type StateRow } from "./states-manager";

export const dynamic = "force-dynamic";

export default async function AdminStatesPage() {
  const { user, scope } = await requireAdminScope(PERMISSIONS.STATES_READ);

  const states = await prisma.state.findMany({
    where: stateWhere(scope),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { districts: true, users: true, tournaments: true } } },
  });

  // Districts not yet assigned to any state (pre-hierarchy data) — shown to
  // GLOBAL users so they can be corrected; nothing is auto-assigned.
  const unassignedDistricts =
    scope.level === "GLOBAL" ? await prisma.district.count({ where: { stateId: null } }) : 0;

  const rows: StateRow[] = states.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    isActive: s.isActive,
    sortOrder: s.sortOrder,
    districtCount: s._count.districts,
    adminCount: s._count.users,
    tournamentCount: s._count.tournaments,
  }));

  return (
    <StatesManager
      states={rows}
      canManage={scope.level === "GLOBAL" && hasPermission(user, PERMISSIONS.STATES_MANAGE)}
      unassignedDistricts={unassignedDistricts}
    />
  );
}
