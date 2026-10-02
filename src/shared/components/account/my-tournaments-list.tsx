import Link from "next/link";
import { Search, Award, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import {
  PAGE_SIZES,
  STATUS_FILTERS,
  hasFilters,
  type MyTournamentList,
  type MyTournamentQuery,
} from "@/modules/tournaments/my-tournaments.server";

const SELECT = "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const ENTRY_LABELS: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected", EXPIRED: "Expired" };

function href(basePath: string, query: MyTournamentQuery, patch: Partial<MyTournamentQuery>): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value === "" || value === undefined) continue;
    if (key === "page" && value === 1) continue;
    if (key === "pageSize" && value === 10) continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/**
 * The player's own tournament history — search, filters and pagination all
 * run on the server (a GET form and links), so only one page of rows is ever
 * loaded. Tournament status, the player's entry status and the certificate
 * are shown separately.
 */
export function MyTournamentsList({
  list,
  query,
  basePath,
  hiddenFields = {},
}: {
  list: MyTournamentList;
  query: MyTournamentQuery;
  basePath: string;
  hiddenFields?: Record<string, string>;
}) {
  const from = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.total, list.page * list.pageSize);
  const filtered = hasFilters(query);

  return (
    <div className="space-y-4" data-testid="my-tournaments">
      <Card>
        <CardContent className="p-4">
          <form method="get" action={basePath} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
            {Object.entries(hiddenFields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <label className="relative">
              <span className="sr-only">Search by tournament name or code</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={query.q}
                placeholder="Search name or code"
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
            <select name="status" defaultValue={query.status} className={SELECT} aria-label="Status">
              {Object.entries(STATUS_FILTERS).map(([value, label]) => (
                <option key={value} value={value}>
                  {value === "" ? "All statuses" : label}
                </option>
              ))}
            </select>
            <select name="year" defaultValue={query.year} className={SELECT} aria-label="Year">
              <option value="">All years</option>
              {list.facets.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select name="certificate" defaultValue={query.certificate} className={SELECT} aria-label="Certificate">
              <option value="">Certificate: all</option>
              <option value="yes">Certificate available</option>
              <option value="no">No certificate</option>
            </select>
            <Button type="submit" size="sm" className="h-10">
              Apply
            </Button>
            {(list.facets.states.length > 1 || list.facets.districts.length > 1) && (
              <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
                {list.facets.states.length > 1 && (
                  <select name="state" defaultValue={query.state} className={SELECT} aria-label="State">
                    <option value="">All states</option>
                    {list.facets.states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                {list.facets.districts.length > 1 && (
                  <select name="district" defaultValue={query.district} className={SELECT} aria-label="District">
                    <option value="">All districts</option>
                    {list.facets.districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500 md:col-span-2 md:col-start-4 md:justify-end">
              <label htmlFor="pageSize">Per page</label>
              <select id="pageSize" name="pageSize" defaultValue={String(query.pageSize)} className={SELECT}>
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {filtered && (
                <Link href={href(basePath, query, { q: "", status: "", year: "", state: "", district: "", certificate: "", page: 1 })} className="text-xs font-semibold text-secondary hover:underline">
                  Reset
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {list.total === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              title={filtered ? "No tournaments match your search." : "You have not registered for any tournaments yet."}
              description={filtered ? "Try another name, code or filter." : "Tournaments you register for appear here, with your entry status and any certificate."}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500" data-testid="results-summary">
            Showing {from}–{to} of {list.total} tournament{list.total === 1 ? "" : "s"}
          </p>
          <Card>
            <CardContent className="p-0">
              <div className="hidden grid-cols-[2fr_1.1fr_1fr_1fr_1fr_auto] gap-3 border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
                <span>Tournament</span>
                <span>Dates · Venue</span>
                <span>Category · Amount</span>
                <span>Status</span>
                <span>Certificate</span>
                <span className="text-right">Action</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {list.rows.map((r) => (
                  <li key={r.registrationId} className="grid gap-2 px-4 py-3.5 lg:grid-cols-[2fr_1.1fr_1fr_1fr_1fr_auto] lg:items-center lg:gap-3" data-tournament={r.tournament.name}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-primary">{r.tournament.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">Code: {r.code}</p>
                      <p className="text-xs text-slate-500">
                        {[r.tournament.district?.name, r.tournament.state?.name].filter(Boolean).join(" · ") || "State-wide"}
                      </p>
                    </div>
                    <div className="text-xs text-slate-600">
                      <p>
                        {formatDate(r.tournament.startDate)} – {formatDate(r.tournament.endDate)}
                      </p>
                      <p className="text-slate-400">{[r.tournament.venue, r.tournament.city].filter(Boolean).join(", ") || "Venue TBA"}</p>
                    </div>
                    <div className="text-xs text-slate-600">
                      <p>{r.category?.name ?? "—"}</p>
                      <p className="text-slate-400">{r.amount != null ? formatInr(r.amount) : "Amount not on record"}</p>
                    </div>
                    <div className="flex flex-col items-start gap-1 text-[11px]">
                      <StatusBadge status={r.tournament.status} label={`Tournament: ${formatTournamentStatus(r.tournament.status)}`} />
                      <StatusBadge status={r.registrationStatus} label={`My entry: ${ENTRY_LABELS[r.registrationStatus] ?? r.registrationStatus}`} />
                      <span className="text-slate-400">Registration {r.registrationWindow.toLowerCase()}</span>
                    </div>
                    <div className="text-xs">
                      {r.certificate ? (
                        <a href={`/api/certificates/${r.certificate.id}/pdf`} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline">
                          <Award className="h-3.5 w-3.5" /> Certificate available
                        </a>
                      ) : (
                        <span className="text-slate-400">Not issued</span>
                      )}
                    </div>
                    <div className="lg:text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/account/tournaments/${r.tournament.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {list.pages > 1 && (
            <nav className="flex flex-wrap items-center justify-between gap-2" aria-label="Pagination">
              <span className="text-xs text-slate-500">
                Page {list.page} of {list.pages}
              </span>
              <div className="flex flex-wrap gap-1">
                {list.page > 1 && (
                  <Link href={href(basePath, query, { page: list.page - 1 })} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2 text-xs hover:bg-slate-50" rel="prev">
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </Link>
                )}
                {Array.from({ length: list.pages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === list.pages || Math.abs(n - list.page) <= 2)
                  .map((n, i, arr) => (
                    <span key={n} className="flex items-center gap-1">
                      {i > 0 && n - arr[i - 1] > 1 && <span className="px-1 text-xs text-slate-400">…</span>}
                      <Link
                        href={href(basePath, query, { page: n })}
                        aria-current={n === list.page ? "page" : undefined}
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs ${n === list.page ? "border-primary bg-primary text-white" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        {n}
                      </Link>
                    </span>
                  ))}
                {list.page < list.pages && (
                  <Link href={href(basePath, query, { page: list.page + 1 })} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2 text-xs hover:bg-slate-50" rel="next">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
