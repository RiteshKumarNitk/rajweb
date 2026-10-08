import Link from "next/link";
import { ShieldCheck, CheckCircle2, ExternalLink, Sparkles, PenTool } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import {
  directOwnedWhere,
  districtOwnedWhere,
  districtWhere,
  playerCertificateWhere,
  tournamentWhere,
  type OrgScope,
} from "@/security/rbac/org-scope";
import { getStateView } from "@/modules/states/state-view.server";
import { StateFilter } from "@/shared/components/admin/state-filter";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { IssueCertificateButton } from "@/shared/components/admin/issue-certificate-button";
import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { Button } from "@/shared/components/ui/button";
import {
  OFFICIAL_SIGNATORIES,
  SAMPLE_CHAMPIONSHIP_CERTIFICATES,
  type CertificateVerificationResult,
} from "@/modules/verify/verify.service";

export const dynamic = "force-dynamic";

interface Filters {
  state?: string;
  district?: string;
  /** Tournament id, or "registration" for registration certificates only. */
  tournament?: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function issuedAtFilter(filters: Filters): Prisma.DateTimeFilter | undefined {
  const from = filters.from && DATE_ONLY.test(filters.from) ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
  const to = filters.to && DATE_ONLY.test(filters.to) ? new Date(`${filters.to}T00:00:00.000Z`) : undefined;
  if (to) to.setUTCDate(to.getUTCDate() + 1); // inclusive end date
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
}

/**
 * Filters narrow what is shown; the scope clause is always ANDed in, so a
 * filter can never widen what the viewer is allowed to see.
 */
async function getCertificates(scope: OrgScope, filters: Filters) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const issuedAt = issuedAtFilter(filters);
    const q = filters.q?.trim();
    const revoked = filters.status === "revoked" ? true : filters.status === "active" ? false : undefined;

    const playerWhere: Prisma.PlayerCertificateWhereInput = {
      AND: [
        playerCertificateWhere(scope),
        filters.district
          ? {
              OR: [
                { tournamentId: { not: null }, tournament: { districtId: filters.district } },
                { tournamentId: null, player: { districtId: filters.district } },
              ],
            }
          : {},
        filters.tournament === "registration"
          ? { tournamentId: null }
          : filters.tournament
            ? { tournamentId: filters.tournament }
            : {},
        q
          ? {
              OR: [
                { certificateNumber: { contains: q, mode: "insensitive" } },
                { player: { name: { contains: q, mode: "insensitive" } } },
                { player: { playerId: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
        revoked === undefined ? {} : { isRevoked: revoked },
        issuedAt ? { issuedAt } : {},
      ],
    };

    const coachWhere: Prisma.CoachCertificateWhereInput = {
      AND: [
        scope.level === "GLOBAL" ? {} : { coach: districtOwnedWhere(scope) },
        filters.district ? { coach: { districtId: filters.district } } : {},
        q
          ? {
              OR: [
                { certificateNumber: { contains: q, mode: "insensitive" } },
                { coach: { name: { contains: q, mode: "insensitive" } } },
                { coach: { coachId: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
        revoked === undefined ? {} : { isRevoked: revoked },
        issuedAt ? { issuedAt } : {},
      ],
    };

    const [playerCerts, coachCerts] = await Promise.all([
      prisma.playerCertificate.findMany({
        where: playerWhere,
        include: {
          player: { include: { district: { include: { state: { select: { name: true } } } } } },
          tournament: { select: { id: true, name: true } },
        },
        orderBy: { issuedAt: "desc" },
        take: 100,
      }),
      // Coach certificates are never tournament certificates.
      filters.tournament && filters.tournament !== "registration"
        ? Promise.resolve([])
        : prisma.coachCertificate.findMany({
            where: coachWhere,
            include: { coach: { include: { district: true } } },
            orderBy: { issuedAt: "desc" },
            take: 100,
          }),
    ]);
    return { playerCerts, coachCerts };
  } catch {
    return { playerCerts: [], coachCerts: [] };
  }
}

/** Approved players in scope without an active *registration* certificate. */
async function getEligiblePlayers(scope: OrgScope) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const players = await prisma.player.findMany({
      where: {
        status: "APPROVED",
        ...districtOwnedWhere(scope),
        certificates: { none: { isRevoked: false, tournamentId: null } },
      },
      include: { district: true },
      orderBy: { name: "asc" },
    });
    return players.map((p) => ({
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      email: p.email,
      district: p.district.name,
    }));
  } catch {
    return [];
  }
}

async function getFilterOptions(scope: OrgScope) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const [districts, tournaments, signatories] = await Promise.all([
      prisma.district.findMany({
        where: districtWhere(scope),
        orderBy: [{ state: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, state: { select: { name: true } } },
      }),
      prisma.tournament.findMany({
        where: tournamentWhere(scope),
        orderBy: { startDate: "desc" },
        take: 200,
        select: { id: true, name: true },
      }),
      prisma.certificateSignatory.findMany({
        where: { ...directOwnedWhere(scope), isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 6,
        include: { state: { select: { name: true } }, district: { select: { name: true } } },
      }),
    ]);
    return { districts, tournaments, signatories };
  } catch {
    return { districts: [], tournaments: [], signatories: [] };
  }
}

type PlayerCertWithPlayer = Awaited<ReturnType<typeof getCertificates>>["playerCerts"][number];
type CoachCertWithCoach = Awaited<ReturnType<typeof getCertificates>>["coachCerts"][number];

function snapshotSigners(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value
    .map((s) => (s && typeof s === "object" && "name" in s ? `${(s as { name: string }).name}${"designation" in s ? ` (${(s as { designation: string }).designation})` : ""}` : null))
    .filter(Boolean)
    .join(", ");
}

export default async function AdminCertificatesPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { user, scope } = await requireAdminScope(PERMISSIONS.CERTIFICATES_READ);
  const filters = await searchParams;
  const { viewScope, states, selectedStateId, scopeLabel } = await getStateView(scope, filters.state);
  const [{ playerCerts, coachCerts }, eligiblePlayers, options] = await Promise.all([
    getCertificates(viewScope, filters),
    getEligiblePlayers(viewScope),
    getFilterOptions(viewScope),
  ]);
  const storage = getStorage();
  const canIssue = hasPermission(user, PERMISSIONS.CERTIFICATES_ISSUE);

  const verifyLink = (n: string) => `/account/verify?certificateNumber=${encodeURIComponent(n)}`;

  const playerColumns: ColumnDef<PlayerCertWithPlayer>[] = [
    {
      header: "Cert No.",
      accessorKey: "certificateNumber",
      className: "font-mono text-xs font-bold text-slate-900",
    },
    {
      header: "Player",
      cell: (c) => (
        <div>
          <p>{c.player.name}</p>
          <p className="font-mono text-[11px] text-slate-400">{c.player.playerId}</p>
        </div>
      ),
    },
    {
      header: "Tournament",
      cell: (c) =>
        c.tournament ? (
          <Link href={`/admin/tournaments/${c.tournament.id}`} className="text-xs text-primary hover:underline">
            {c.tournament.name}
          </Link>
        ) : (
          <span className="text-xs text-slate-500">Registration</span>
        ),
    },
    {
      header: "District / State",
      cell: (c) => {
        const district = c.districtName ?? c.player.district?.name ?? "—";
        const state = c.stateName ?? c.player.district?.state?.name ?? null;
        return <span className="text-xs">{state ? `${district}, ${state}` : district}</span>;
      },
    },
    {
      header: "Signed by",
      cell: (c) => (
        <span className="text-[11px] text-slate-600">
          {snapshotSigners(c.signatories) ?? <span className="text-slate-400">Not recorded (issued before signatory tracking)</span>}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (c) =>
        c.isRevoked ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Revoked</span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span>
        ),
    },
    { header: "Issued", cell: (c) => formatDate(c.issuedAt) },
    {
      header: "Actions",
      cell: (c) => (
        <div className="flex items-center gap-2">
          <a href={`/api/certificates/${c.id}/pdf`} className="text-xs font-semibold text-primary hover:underline">
            PDF
          </a>
          <Link href={verifyLink(c.certificateNumber)} target="_blank" className="flex items-center gap-0.5 text-xs font-semibold text-accent hover:underline">
            Verify & Preview <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ),
    },
  ];

  const coachColumns: ColumnDef<CoachCertWithCoach>[] = [
    {
      header: "Cert No.",
      accessorKey: "certificateNumber",
      className: "font-mono text-xs font-bold text-slate-900",
    },
    { header: "Coach", cell: (c) => c.coach.name },
    { header: "District", cell: (c) => c.coach.district?.name ?? "—" },
    { header: "Issued", cell: (c) => formatDate(c.issuedAt) },
    {
      header: "Actions",
      cell: (c) => (
        <div className="flex items-center gap-2">
          {c.pdfPath && (
            <a href={storage.getUrl(c.pdfPath)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
              PDF
            </a>
          )}
          <Link href={verifyLink(c.certificateNumber)} target="_blank" className="flex items-center gap-0.5 text-xs font-semibold text-accent hover:underline">
            Verify & Preview <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ),
    },
  ];

  // Static demonstration records (see modules/verify/verify.types.ts); their
  // printed signatories are part of that fixed sample content.
  const sampleChampionshipColumns: ColumnDef<CertificateVerificationResult>[] = [
    {
      header: "Serial No.",
      cell: (c) => <span className="font-mono text-xs font-bold text-pink-700">{c.certificateNumber}</span>,
    },
    {
      header: "Candidate & Guardian",
      cell: (c) => (
        <div>
          <p className="font-semibold text-slate-900">{c.name}</p>
          <p className="text-[11px] text-slate-500">S/D of {c.fatherName}</p>
        </div>
      ),
    },
    { header: "District", accessorKey: "district" },
    {
      header: "Category & Event",
      cell: (c) => (
        <span className="text-xs font-medium text-slate-700">
          {c.category} · {c.event}
        </span>
      ),
    },
    {
      header: "Position",
      cell: (c) => (
        <span className="rounded-full border border-pink-200 bg-pink-100 px-2.5 py-0.5 text-[11px] font-extrabold text-pink-800">
          {c.position}
        </span>
      ),
    },
    {
      header: "Authorized Signers",
      cell: () => (
        <div className="text-[11px] text-slate-600">
          <p>
            President: <strong className="text-slate-800">{OFFICIAL_SIGNATORIES.president.name}</strong>
          </p>
          <p>
            Gen. Sec: <strong className="text-slate-800">{OFFICIAL_SIGNATORIES.generalSecretary.name}</strong>
          </p>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (c) => (
        <Button size="sm" variant="outline" asChild className="h-7 border-pink-200 text-xs text-pink-700 hover:bg-pink-50">
          <Link href={verifyLink(c.certificateNumber)} target="_blank">
            Verify & Preview <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      ),
    },
  ];

  const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-2 text-sm";

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Certificates & Signatures Management</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{scopeLabel}</span>
          </div>
          <p className="text-sm text-slate-500">
            Registration and tournament certificates in your scope, with the officials who signed them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StateFilter states={states} selectedStateId={selectedStateId} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/certificates/templates">Templates</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/account/verify" target="_blank" className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Open Verification Portal
            </Link>
          </Button>
          {canIssue && <IssueCertificateButton players={eligiblePlayers} label="Issue Registration Certificate" />}
        </div>
      </div>

      {/* Signatory registry (database-driven, scoped) */}
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-pink-500/30 bg-pink-500/20 text-pink-400">
                <PenTool className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-white">Certificate Signatories</CardTitle>
                <CardDescription className="text-xs text-slate-300">
                  Each tournament chooses its own signers; registration certificates use the state&apos;s officials.
                </CardDescription>
              </div>
            </div>
            <Button size="sm" variant="outline" asChild className="border-white/30 bg-transparent text-xs text-white hover:bg-white/10">
              <Link href="/admin/certificates/signatories">Manage signatories</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {options.signatories.length === 0 ? (
            <p className="text-sm text-slate-300">No active signatories in this scope yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {options.signatories.map((s) => (
                <div key={s.id} className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                      {s.district ? s.district.name : s.state ? s.state.name : "Federation level"}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  </div>
                  <p className="text-base font-black text-white">{s.name}</p>
                  <p className="text-xs font-semibold text-pink-300">{s.designation}</p>
                  {s.organization && <p className="text-[11px] text-slate-400">{s.organization}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters (GET form — server-side, always within the viewer's scope) */}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {selectedStateId && <input type="hidden" name="state" value={selectedStateId} />}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          District
          <select name="district" defaultValue={filters.district ?? ""} className={selectClass}>
            <option value="">All districts</option>
            {options.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.state ? ` (${d.state.name})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Tournament
          <select name="tournament" defaultValue={filters.tournament ?? ""} className={selectClass}>
            <option value="">All certificates</option>
            <option value="registration">Registration certificates only</option>
            {options.tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Player / certificate no.
          <input name="q" defaultValue={filters.q ?? ""} placeholder="Name, ID or number" className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Issued from
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          to
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={selectClass} />
        </label>
        <Button type="submit" size="sm">
          Apply
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={selectedStateId ? `/admin/certificates?state=${selectedStateId}` : "/admin/certificates"}>Reset</Link>
        </Button>
      </form>

      {/* Player & Coach Certificate Tables */}
      <DashboardCard title={`Player Certificates (${playerCerts.length}${playerCerts.length === 100 ? "+" : ""})`}>
        <DataTable data={playerCerts} columns={playerColumns} keyExtractor={(c) => c.id} emptyTitle="No player certificates match" />
      </DashboardCard>
      <DashboardCard title={`Coach Registration Certificates (${coachCerts.length})`}>
        <DataTable data={coachCerts} columns={coachColumns} keyExtractor={(c) => c.id} emptyTitle="No coach certificates match" />
      </DashboardCard>

      {/* State Championship sample certificates (static demo data) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            State Championship Certificates & Demo Records ({SAMPLE_CHAMPIONSHIP_CERTIFICATES.length})
          </CardTitle>
          <Button size="sm" variant="outline" asChild className="text-xs">
            <Link href="/account/verify" target="_blank">
              Test in Verification Portal <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Static demonstration records
            </p>
            <p className="mt-0.5 text-[11px] text-amber-800">
              Built into the code (not issued through the system); they verify on the public page for demonstration.
            </p>
          </div>
          <DataTable data={SAMPLE_CHAMPIONSHIP_CERTIFICATES} columns={sampleChampionshipColumns} keyExtractor={(c) => c.certificateNumber} />
        </CardContent>
      </Card>
    </div>
  );
}
