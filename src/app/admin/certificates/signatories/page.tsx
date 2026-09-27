import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { directOwnedWhere } from "@/security/rbac/org-scope";
import { getStateView } from "@/modules/states/state-view.server";
import { getTournamentOwnerGroups } from "@/modules/tournaments/tournament-owner-groups.server";
import { StateFilter } from "@/shared/components/admin/state-filter";
import { SignatoriesManager, type SignatoryRow } from "./signatories-manager";

export const dynamic = "force-dynamic";

export default async function AdminSignatoriesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { user, scope } = await requireAdminScope(PERMISSIONS.CERTIFICATES_READ);
  const { viewScope, states, selectedStateId, scopeLabel } = await getStateView(scope, (await searchParams).state);
  const canManage = hasPermission(user, PERMISSIONS.CERTIFICATES_ISSUE);

  const [signatories, ownerGroups] = await Promise.all([
    prisma.certificateSignatory.findMany({
      where: directOwnedWhere(viewScope),
      include: {
        state: { select: { name: true } },
        district: { select: { name: true } },
        _count: { select: { tournaments: true } },
      },
      orderBy: [{ stateId: "asc" }, { districtId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    canManage ? getTournamentOwnerGroups(scope) : Promise.resolve([]),
  ]);

  const rows: SignatoryRow[] = signatories.map((s) => ({
    id: s.id,
    name: s.name,
    designation: s.designation,
    organization: s.organization,
    signatureImageUrl: s.signatureImageUrl,
    stateId: s.stateId,
    districtId: s.districtId,
    scopeName: s.district ? `${s.district.name}${s.state ? `, ${s.state.name}` : ""}` : s.state ? s.state.name : "Federation level",
    isActive: s.isActive,
    sortOrder: s.sortOrder,
    tournamentCount: s._count.tournaments,
  }));

  return (
    <div className="space-y-6">
      <Link href="/admin/certificates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Certificates
      </Link>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Certificate Signatories</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{scopeLabel}</span>
          </div>
          <p className="text-sm text-slate-500">
            Officials who sign certificates. Each tournament picks its own signatories; issued certificates keep the
            names and designations they were signed with.
          </p>
        </div>
        <StateFilter states={states} selectedStateId={selectedStateId} />
      </div>
      <SignatoriesManager
        rows={rows}
        canManage={canManage}
        ownerGroups={ownerGroups}
        allowFederationLevel={scope.level === "GLOBAL"}
        lockedDistrictId={scope.level === "DISTRICT" ? scope.districtId : undefined}
      />
    </div>
  );
}
