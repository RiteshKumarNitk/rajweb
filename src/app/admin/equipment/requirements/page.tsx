import Link from "next/link";
import type { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { directOwnedWhere, districtWhere } from "@/security/rbac/org-scope";
import { getStateView } from "@/modules/states/state-view.server";
import { StateFilter } from "@/shared/components/admin/state-filter";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STATUSES,
  allowedRequirementMoves,
  canReviewRequirements,
} from "@/modules/equipment/requirement.service";
import { RequirementsManager, type RequirementRow } from "./requirements-manager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface Filters {
  state?: string;
  district?: string;
  status?: string;
  priority?: string;
  q?: string;
  page?: string;
}

export default async function AdminRequirementsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { user, scope } = await requireAdminScope(PERMISSIONS.EQUIPMENT_READ);
  const filters = await searchParams;
  const { viewScope, states, selectedStateId, scopeLabel } = await getStateView(scope, filters.state);
  const canManage = hasPermission(user, PERMISSIONS.EQUIPMENT_MANAGE);
  const canReview = canManage && canReviewRequirements(user);
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const q = filters.q?.trim();

  // Scope always ANDed in — filters only narrow.
  const where: Prisma.EquipmentRequirementWhereInput = {
    AND: [
      directOwnedWhere(viewScope),
      filters.district ? { districtId: filters.district } : {},
      REQUIREMENT_STATUSES.includes(filters.status as (typeof REQUIREMENT_STATUSES)[number]) ? { status: filters.status as (typeof REQUIREMENT_STATUSES)[number] } : {},
      REQUIREMENT_PRIORITIES.includes(filters.priority as (typeof REQUIREMENT_PRIORITIES)[number]) ? { priority: filters.priority as (typeof REQUIREMENT_PRIORITIES)[number] } : {},
      q ? { OR: [{ itemName: { contains: q, mode: "insensitive" } }, { requirementNumber: { contains: q, mode: "insensitive" } }] } : {},
    ],
  };

  const [total, requirements, districts, statusCounts] = await Promise.all([
    prisma.equipmentRequirement.count({ where }),
    prisma.equipmentRequirement.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        state: { select: { name: true } },
        district: { select: { name: true } },
        requestedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.district.findMany({
      where: { ...districtWhere(viewScope), stateId: { not: null } },
      orderBy: [{ state: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, state: { select: { name: true } } },
    }),
    prisma.equipmentRequirement.groupBy({ by: ["status"], where: directOwnedWhere(viewScope), _count: true }),
  ]);

  const rows: RequirementRow[] = requirements.map((r) => ({
    id: r.id,
    requirementNumber: r.requirementNumber,
    itemName: r.itemName,
    category: r.category,
    description: r.description,
    quantity: r.quantity,
    estimatedUnitPrice: r.estimatedUnitPrice,
    priority: r.priority,
    notes: r.notes,
    requiredBy: r.requiredBy ? r.requiredBy.toISOString().slice(0, 10) : null,
    attachmentId: r.attachmentId,
    status: r.status,
    reviewNote: r.reviewNote,
    reviewedBy: r.reviewedBy?.name ?? null,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    districtName: r.district.name,
    stateName: r.state.name,
    requestedBy: r.requestedBy.name || r.requestedBy.email,
    createdAt: r.createdAt.toISOString(),
    nextStatuses: allowedRequirementMoves(r.status),
  }));
  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams(Object.entries({ ...filters, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/admin/equipment/requirements?${params.toString()}`;
  };
  const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">District Requirements</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{scopeLabel}</span>
          </div>
          <p className="text-sm text-slate-500">
            Equipment a district needs. Districts raise requirements; the State Admin or Super Admin reviews them.
          </p>
        </div>
        <StateFilter states={states} selectedStateId={selectedStateId} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {REQUIREMENT_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/equipment/requirements?${new URLSearchParams({ ...(selectedStateId ? { state: selectedStateId } : {}), status: s }).toString()}`}
            className="rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300"
          >
            <p className="text-xl font-bold text-slate-900">{counts[s] ?? 0}</p>
            <p className="text-xs text-slate-500">{s.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</p>
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {selectedStateId && <input type="hidden" name="state" value={selectedStateId} />}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Search
          <Input name="q" defaultValue={filters.q ?? ""} placeholder="Item or requirement no." className="h-9 w-56" />
        </label>
        {scope.level !== "DISTRICT" && (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            District
            <select name="district" defaultValue={filters.district ?? ""} className={selectClass}>
              <option value="">All in scope</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.state ? ` (${d.state.name})` : ""}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
            <option value="">Any</option>
            {REQUIREMENT_STATUSES.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Priority
          <select name="priority" defaultValue={filters.priority ?? ""} className={selectClass}>
            <option value="">Any</option>
            {REQUIREMENT_PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </label>
        <Button type="submit" size="sm">Apply</Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={selectedStateId ? `/admin/equipment/requirements?state=${selectedStateId}` : "/admin/equipment/requirements"}>Reset</Link>
        </Button>
        <span className="ml-auto text-xs text-slate-500">{total} requirement{total === 1 ? "" : "s"}</span>
      </form>

      <RequirementsManager
        rows={rows}
        canManage={canManage}
        canReview={canReview}
        districtLocked={scope.level === "DISTRICT"}
        districts={districts.map((d) => ({ id: d.id, label: d.state ? `${d.name} (${d.state.name})` : d.name }))}
      />

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Button size="sm" variant="outline" asChild><Link href={pageHref(page - 1)}>Previous</Link></Button>}
            {page < pages && <Button size="sm" variant="outline" asChild><Link href={pageHref(page + 1)}>Next</Link></Button>}
          </div>
        </div>
      )}
    </div>
  );
}
