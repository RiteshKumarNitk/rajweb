"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, GraduationCap, Award, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { DataTable, type ColumnDef } from "@/shared/components/ui/data-table";

export interface CoachRow {
  id: string;
  coachId: string;
  name: string;
  email: string;
  mobile: string;
  qualification: string;
  certificationLevel: string;
  district: string;
  status: string;
  createdAt: string;
}

export function CoachesTable({ coaches }: { coaches: CoachRow[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredCoaches = useMemo(() => {
    return coaches.filter((coach) => {
      const matchesSearch =
        searchQuery === "" ||
        coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coach.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coach.coachId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coach.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coach.certificationLevel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || coach.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [coaches, searchQuery, statusFilter]);

  const columns: ColumnDef<CoachRow>[] = [
    {
      header: "Coach ID",
      cell: (c) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {c.coachId}
        </span>
      ),
    },
    {
      header: "Coach Name",
      cell: (c) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{c.name}</p>
          <p className="text-xs text-slate-400">{c.email} · {c.mobile}</p>
        </div>
      ),
    },
    {
      header: "Licensing Level",
      cell: (c) => {
        const levelFormatted = c.certificationLevel.replace(/_/g, " ");
        const isAdvanced = c.certificationLevel.includes("LEVEL_3") || c.certificationLevel.includes("INTERNATIONAL");
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${
              isAdvanced
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            <GraduationCap className="h-3 w-3" /> {levelFormatted}
          </span>
        );
      },
    },
    {
      header: "District Unit",
      cell: (c) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {c.district}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (c) => <StatusBadge status={c.status} />,
    },
    {
      header: "Actions",
      cell: (c) => (
        <Button variant="outline" size="sm" asChild className="h-7 text-xs">
          <Link href={`/admin/applications/coach/${c.id}`} className="flex items-center gap-1">
            Review Record <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coach, ID, level, district..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "All Coaches" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        data={filteredCoaches}
        columns={columns}
        keyExtractor={(c) => c.id}
        emptyTitle="No coaches found"
        emptyDescription="No coach records match your active search or filter."
      />
    </div>
  );
}
