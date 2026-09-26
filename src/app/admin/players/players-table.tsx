"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, CheckCircle2, Clock, XCircle, Award, ShieldCheck, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import {
  IssuePlayerCertificateModal,
  type EligiblePlayer,
  type PlayerCertificateInfo,
} from "@/shared/components/admin/issue-player-certificate-modal";
import { CertificateDetailsModal } from "@/shared/components/admin/certificate-details-modal";
import { DataTable, type ColumnDef } from "@/shared/components/ui/data-table";

export type PlayerRow = EligiblePlayer & {
  status: string;
  certificate: PlayerCertificateInfo | null;
};

export function PlayersTable({ players }: { players: PlayerRow[] }) {
  const [viewPlayer, setViewPlayer] = useState<(EligiblePlayer & { certificate: PlayerCertificateInfo }) | null>(null);
  const [issuePlayer, setIssuePlayer] = useState<EligiblePlayer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const eligibleForIssue = useMemo(
    () =>
      players
        .filter((p) => p.status === "APPROVED" && !p.certificate)
        .map(({ id, playerId, name, email, district }) => ({ id, playerId, name, email, district })),
    [players]
  );

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch =
        searchQuery === "" ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.playerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.district.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || player.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [players, searchQuery, statusFilter]);

  async function handleApproveReject(player: PlayerRow, action: "approve" | "reject") {
    let body: string | undefined;
    if (action === "reject") {
      const reason = window.prompt(`Reason for rejecting ${player.name}'s application:`)?.trim();
      if (!reason) return;
      body = JSON.stringify({ reason });
    }
    setLoading(`${player.id}-${action}`);
    try {
      const res = await apiFetch(`/api/admin/players/${player.id}/${action}`, { method: "POST", body });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Action completed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  const columns: ColumnDef<PlayerRow>[] = [
    {
      header: "Player ID",
      cell: (p) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {p.playerId}
        </span>
      ),
    },
    {
      header: "Athlete Name",
      cell: (p) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
          <p className="text-xs text-slate-400">{p.email}</p>
        </div>
      ),
    },
    {
      header: "District Unit",
      cell: (p) => (
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/60">
          {p.district}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (player) => <StatusBadge status={player.status} />,
    },
    {
      header: "Digital Certificate",
      cell: (player) =>
        player.certificate ? (
          <button
            type="button"
            onClick={() => setViewPlayer({ ...player, certificate: player.certificate! })}
            className="group flex items-center gap-1 text-left text-xs font-mono font-bold text-amber-600 hover:text-amber-700 hover:underline"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{player.certificate.certificateNumber}</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">Not issued</span>
        ),
    },
    {
      header: "Actions",
      cell: (player) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {player.status === "PENDING" && (
            <>
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => handleApproveReject(player, "approve")}
                disabled={!!loading}
              >
                {loading === `${player.id}-approve` ? "..." : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                onClick={() => handleApproveReject(player, "reject")}
                disabled={!!loading}
              >
                {loading === `${player.id}-reject` ? "..." : "Reject"}
              </Button>
            </>
          )}
          {player.status === "APPROVED" && !player.certificate && (
            <Button
              size="sm"
              className="h-7 text-xs bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
              onClick={() => setIssuePlayer(player)}
            >
              <Award className="mr-1 h-3 w-3" /> Issue Cert
            </Button>
          )}
          {player.certificate && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setViewPlayer({ ...player, certificate: player.certificate! })}
            >
              View Credentials
            </Button>
          )}
        </div>
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
            placeholder="Search by name, ID, or district..."
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
              {st === "ALL" ? "All Players" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        data={filteredPlayers}
        columns={columns}
        keyExtractor={(p) => p.id}
        emptyTitle="No players found"
        emptyDescription="No athlete records match your active search or filter."
      />

      {viewPlayer && <CertificateDetailsModal player={viewPlayer} onClose={() => setViewPlayer(null)} />}
      <IssuePlayerCertificateModal
        open={!!issuePlayer}
        onClose={() => setIssuePlayer(null)}
        players={eligibleForIssue}
        preselectedPlayerId={issuePlayer?.id}
      />
    </div>
  );
}
