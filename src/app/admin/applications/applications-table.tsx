"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { DataTable, type ColumnDef } from "@/shared/components/ui/data-table";
import { formatDate } from "@/lib/utils";

export type ApplicationType = "player" | "coach" | "club" | "school" | "academy";

export interface ApplicationRow {
  type: ApplicationType;
  id: string;
  applicationId: string;
  applicantName: string;
  email: string;
  district: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<ApplicationType, string> = {
  player: "Player",
  coach: "Coach",
  club: "Club Membership",
  school: "School Membership",
  academy: "Academy Membership",
};

const TABS: { key: "all" | ApplicationType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "player", label: "Players" },
  { key: "coach", label: "Coaches" },
  { key: "club", label: "Club Memberships" },
  { key: "school", label: "School Memberships" },
  { key: "academy", label: "Academy Memberships" },
];

export function ApplicationsTable({ applications }: { applications: ApplicationRow[] }) {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const initialStatus = searchParams.get("status");

  const [tab, setTab] = useState<"all" | ApplicationType>(
    initialType && TABS.some((t) => t.key === initialType) ? (initialType as ApplicationType) : "all"
  );
  const [status, setStatus] = useState(initialStatus ?? "");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const districts = useMemo(
    () => Array.from(new Set(applications.map((a) => a.district))).sort(),
    [applications]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (tab !== "all" && a.type !== tab) return false;
      if (status && a.status !== status) return false;
      if (district && a.district !== district) return false;
      if (fromDate && new Date(a.submittedAt) < new Date(fromDate)) return false;
      if (toDate && new Date(a.submittedAt) > new Date(`${toDate}T23:59:59`)) return false;
      if (q) {
        const haystack = `${a.applicationId} ${a.applicantName} ${a.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [applications, tab, status, district, fromDate, toDate, search]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications.length };
    for (const t of TABS) {
      if (t.key === "all") continue;
      counts[t.key] = applications.filter((a) => a.type === t.key).length;
    }
    return counts;
  }, [applications]);

  const columns: ColumnDef<ApplicationRow>[] = [
    { header: "Application ID", accessorKey: "applicationId", className: "font-mono text-xs" },
    { header: "Applicant", accessorKey: "applicantName", className: "font-medium" },
    { header: "Email", accessorKey: "email" },
    { header: "Type", cell: (a) => TYPE_LABELS[a.type] },
    { header: "District", accessorKey: "district" },
    { header: "Submitted", cell: (a) => formatDate(a.submittedAt) },
    { header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
    {
      header: "Actions",
      cell: (a) => (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/applications/${a.type}/${a.id}`}>Review</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label} ({tabCounts[t.key] ?? 0})
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by applicant, email, or application ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="Submitted from" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="Submitted to" />
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(a) => `${a.type}-${a.id}`}
        emptyTitle="No applications match these filters"
      />
    </div>
  );
}
