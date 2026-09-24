"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
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
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const eligibleForIssue = players
    .filter((p) => p.status === "APPROVED" && !p.certificate)
    .map(({ id, playerId, name, email, district }) => ({ id, playerId, name, email, district }));

  async function handleApproveReject(player: PlayerRow, action: "approve" | "reject") {
    setLoading(`${player.id}-${action}`);
    try {
      const res = await apiFetch(`/api/admin/players/${player.id}/${action}`, { method: "POST" });
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
    { header: "Player ID", accessorKey: "playerId", className: "font-mono text-xs" },
    { header: "Name", accessorKey: "name", className: "font-medium" },
    { header: "District", accessorKey: "district" },
    { header: "Email", accessorKey: "email" },
    {
      header: "Status",
      cell: (player) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            player.status === "APPROVED"
              ? "bg-green-100 text-green-700"
              : player.status === "PENDING"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {player.status}
        </span>
      ),
    },
    {
      header: "Certificate",
      cell: (player) =>
        player.certificate ? (
          <button
            type="button"
            onClick={() => setViewPlayer({ ...player, certificate: player.certificate! })}
            className="text-left text-xs font-mono text-accent hover:underline"
          >
            {player.certificate.certificateNumber}
          </button>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      header: "Actions",
      cell: (player) => (
        <div className="flex flex-wrap gap-2">
          {player.status === "PENDING" && (
            <>
              <Button size="sm" onClick={() => handleApproveReject(player, "approve")} disabled={!!loading}>
                {loading === `${player.id}-approve` ? "..." : "Approve"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleApproveReject(player, "reject")} disabled={!!loading}>
                {loading === `${player.id}-reject` ? "..." : "Reject"}
              </Button>
            </>
          )}
          {player.status === "APPROVED" && !player.certificate && (
            <Button size="sm" variant="accent" onClick={() => setIssuePlayer(player)}>
              Issue Cert
            </Button>
          )}
          {player.certificate && (
            <Button size="sm" variant="outline" onClick={() => setViewPlayer({ ...player, certificate: player.certificate! })}>
              View Cert
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={players}
        columns={columns}
        keyExtractor={(p) => p.id}
        emptyTitle="No players registered yet"
      />

      {viewPlayer && <CertificateDetailsModal player={viewPlayer} onClose={() => setViewPlayer(null)} />}
      <IssuePlayerCertificateModal
        open={!!issuePlayer}
        onClose={() => setIssuePlayer(null)}
        players={eligibleForIssue}
        preselectedPlayerId={issuePlayer?.id}
      />
    </>
  );
}
