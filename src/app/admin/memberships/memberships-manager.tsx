"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Building2, School, Landmark, ExternalLink, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { DataTable, type ColumnDef } from "@/shared/components/ui/data-table";

export interface MembershipRow {
  id: string;
  membershipId: string;
  name: string;
  district: string;
  status: string;
  type: "club" | "school" | "academy";
  createdAt: string;
}

export function MembershipsManager({
  clubs,
  schools,
  academies,
}: {
  clubs: MembershipRow[];
  schools: MembershipRow[];
  academies: MembershipRow[];
}) {
  const [activeTab, setActiveTab] = useState<"ALL" | "club" | "school" | "academy">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const allMemberships = useMemo(() => {
    return [...clubs, ...schools, ...academies].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [clubs, schools, academies]);

  const displayedMemberships = useMemo(() => {
    return allMemberships.filter((m) => {
      const matchesTab = activeTab === "ALL" || m.type === activeTab;
      const matchesSearch =
        searchQuery === "" ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.membershipId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.district.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [allMemberships, activeTab, searchQuery]);

  const columns: ColumnDef<MembershipRow>[] = [
    {
      header: "Type",
      cell: (m) => {
        if (m.type === "club") {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <Building2 className="h-3 w-3" /> Club
            </span>
          );
        }
        if (m.type === "school") {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <School className="h-3 w-3" /> School
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <Landmark className="h-3 w-3" /> Academy
          </span>
        );
      },
    },
    {
      header: "Affiliation ID",
      cell: (m) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {m.membershipId}
        </span>
      ),
    },
    {
      header: "Institution / Entity Name",
      cell: (m) => <span className="font-semibold text-slate-900 text-sm">{m.name}</span>,
    },
    {
      header: "District Unit",
      cell: (m) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {m.district}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (m) => <StatusBadge status={m.status} />,
    },
    {
      header: "Actions",
      cell: (m) => (
        <Button variant="outline" size="sm" asChild className="h-7 text-xs">
          <Link href={`/admin/applications/${m.type}/${m.id}`} className="flex items-center gap-1">
            Review <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Category Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "ALL" ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Affiliations ({allMemberships.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("club")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "club" ? "bg-blue-600 text-white shadow-xs" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> Clubs ({clubs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("school")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "school" ? "bg-amber-600 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <School className="h-3.5 w-3.5" /> Schools ({schools.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("academy")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "academy" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <Landmark className="h-3.5 w-3.5" /> Academies ({academies.length})
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or district..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      <DataTable
        data={displayedMemberships}
        columns={columns}
        keyExtractor={(m) => m.id}
        emptyTitle="No institutional affiliations found"
        emptyDescription="No applications match your active category or search query."
      />
    </div>
  );
}
