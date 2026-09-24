"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { DataTable, type ColumnDef } from "@/shared/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { REQUEST_TYPE_LABELS, REQUEST_TYPES, type RequestTypeValue } from "@/modules/requests/request-types";

export interface AdminRequestRow {
  id: string;
  requestNumber: string;
  userName: string;
  userEmail: string;
  profileType: "player" | "coach";
  type: RequestTypeValue;
  status: string;
  district: string;
  requestedDistrict: string | null;
  submittedAt: string;
}

export function RequestsTable({ requests }: { requests: AdminRequestRow[] }) {
  const [tab, setTab] = useState<"all" | "player" | "coach">("all");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");

  const districts = useMemo(() => Array.from(new Set(requests.map((r) => r.district))).sort(), [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (tab !== "all" && r.profileType !== tab) return false;
      if (type && r.type !== type) return false;
      if (status && r.status !== status) return false;
      if (district && r.district !== district) return false;
      if (q) {
        const haystack = `${r.requestNumber} ${r.userName} ${r.userEmail}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requests, tab, type, status, district, search]);

  const columns: ColumnDef<AdminRequestRow>[] = [
    { header: "Request ID", accessorKey: "requestNumber", className: "font-mono text-xs" },
    { header: "User", accessorKey: "userName", className: "font-medium" },
    { header: "Profile", cell: (r) => (r.profileType === "player" ? "Player" : "Coach") },
    { header: "Type", cell: (r) => REQUEST_TYPE_LABELS[r.type] },
    {
      header: "District",
      cell: (r) => (r.requestedDistrict ? `${r.district} → ${r.requestedDistrict}` : r.district),
    },
    { header: "Submitted", cell: (r) => formatDate(r.submittedAt) },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: "Actions",
      cell: (r) => (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/requests/${r.id}`}>Review</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(["all", "player", "coach"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t === "all" ? "All" : t === "player" ? "Player Requests" : "Coach Requests"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search by user or request ID" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Request Types</option>
          {REQUEST_TYPES.map((t) => (
            <option key={t} value={t}>{REQUEST_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
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
      </div>

      <DataTable data={filtered} columns={columns} keyExtractor={(r) => r.id} emptyTitle="No requests match these filters" />
    </div>
  );
}
