import type { Metadata } from "next";
import Link from "next/link";
import { Award, Download, Eye, ShieldCheck } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { requireOwnPlayer } from "../require-own-player";
import { certificateKind, certificateStatus, certificateTitle } from "./certificate-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Certificates" };

/**
 * The player's own certificates (session player only). Read-only: View,
 * Download PDF and Verify — certificates cannot be edited or deleted here.
 */
export default async function PlayerCertificatesPage() {
  const { player } = await requireOwnPlayer();

  const certificates = await prisma.playerCertificate.findMany({
    where: { playerId: player.id },
    select: {
      id: true,
      certificateNumber: true,
      tournamentId: true,
      title: true,
      eventName: true,
      eventStartDate: true,
      position: true,
      issuedAt: true,
      expiresAt: true,
      isRevoked: true,
      tournament: { select: { name: true, startDate: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-accent" /> My Certificates
        </CardTitle>
        <CardDescription className="text-xs">Certificates issued to you by the association</CardDescription>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <EmptyState
            title="No certificates yet"
            description="Certificates appear here once the association issues them — for your registration or for tournaments you took part in."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2" data-testid="my-certificates">
            {certificates.map((c) => {
              const status = certificateStatus(c);
              const tournamentName = c.eventName ?? c.tournament?.name ?? null;
              const eventDate = c.eventStartDate ?? c.tournament?.startDate ?? null;
              return (
                <div key={c.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs" data-certificate={c.certificateNumber}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{certificateKind(c)}</p>
                      <p className="text-base font-bold text-primary">{certificateTitle(c)}</p>
                    </div>
                    <StatusBadge status={status.status} label={status.label} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2">
                      <dt className="text-slate-500">Tournament</dt>
                      <dd className="font-semibold text-slate-900">{tournamentName ?? "— (registration certificate)"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Year</dt>
                      <dd className="font-semibold text-slate-900">{(eventDate ?? c.issuedAt).getFullYear()}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Issued</dt>
                      <dd className="font-semibold text-slate-900">{formatDate(c.issuedAt)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Certificate No</dt>
                      <dd className="font-mono font-semibold text-slate-900">{c.certificateNumber}</dd>
                    </div>
                    {c.position && (
                      <div className="col-span-2">
                        <dt className="text-slate-500">Achievement</dt>
                        <dd className="font-semibold text-slate-900">{c.position}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/account/player/certificates/${c.id}`}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </Button>
                    {!c.isRevoked && (
                      <Button size="sm" asChild>
                        <a href={`/api/certificates/${c.id}/pdf`}>
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/verify?certificateNumber=${encodeURIComponent(c.certificateNumber)}`} target="_blank">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verify
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
