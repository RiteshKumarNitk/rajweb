import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Award, Download, ShieldCheck, PenLine } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { certificateVerificationUrl } from "@/modules/verify/verification-url";
import { requireOwnPlayer } from "../../require-own-player";
import { certificateKind, certificateStatus, certificateTitle } from "../certificate-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Certificate Details" };

interface Signatory {
  name?: string;
  designation?: string;
  organization?: string | null;
}

/**
 * One of the player's own certificates, as issued (snapshot fields). Looked up
 * with the session player's id — another player's certificate is a 404.
 */
export default async function PlayerCertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { player } = await requireOwnPlayer();
  const { certificateId } = await params;

  const c = await prisma.playerCertificate.findFirst({
    where: { id: certificateId, playerId: player.id },
    select: {
      id: true,
      certificateNumber: true,
      qrCode: true,
      tournamentId: true,
      title: true,
      eventName: true,
      eventStartDate: true,
      eventEndDate: true,
      venue: true,
      districtName: true,
      stateName: true,
      position: true,
      signatories: true,
      recipientName: true,
      issuedAt: true,
      expiresAt: true,
      isRevoked: true,
      revokedAt: true,
      revokedReason: true,
      tournament: { select: { id: true, name: true } },
    },
  });
  if (!c) notFound();

  const status = certificateStatus(c);
  const verifyUrl = certificateVerificationUrl(c.qrCode);
  const qrImage = await QRCode.toDataURL(verifyUrl, { width: 160 });
  const signatories = (Array.isArray(c.signatories) ? c.signatories : []) as Signatory[];
  const eventDates =
    c.eventStartDate && c.eventEndDate
      ? formatDate(c.eventStartDate) === formatDate(c.eventEndDate)
        ? formatDate(c.eventStartDate)
        : `${formatDate(c.eventStartDate)} – ${formatDate(c.eventEndDate)}`
      : null;

  const rows: Array<[string, React.ReactNode]> = [
    ["Certificate Number", <span key="n" className="font-mono">{c.certificateNumber}</span>],
    ["Certificate Type", certificateKind(c)],
    ["Title", certificateTitle(c)],
    ["Tournament", c.eventName ?? c.tournament?.name ?? "— (registration certificate)"],
    ...(eventDates ? ([["Tournament Dates", eventDates]] as Array<[string, React.ReactNode]>) : []),
    ...(c.venue ? ([["Venue", c.venue]] as Array<[string, React.ReactNode]>) : []),
    ["State", c.stateName ?? "—"],
    ["District", c.districtName ?? "—"],
    ["Player Name", c.recipientName ?? player.name],
    ...(c.position ? ([["Achievement", c.position]] as Array<[string, React.ReactNode]>) : []),
    ["Issued", formatDate(c.issuedAt)],
    ["Valid Until", c.expiresAt ? formatDate(c.expiresAt) : "No expiry"],
    ["Status", <StatusBadge key="s" status={status.status} label={status.label} />],
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-slate-500 hover:text-primary">
        <Link href="/account/player/certificates">
          <ArrowLeft className="h-3.5 w-3.5" /> My Certificates
        </Link>
      </Button>

      {c.isRevoked && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          This certificate was revoked{c.revokedAt ? ` on ${formatDate(c.revokedAt)}` : ""}
          {c.revokedReason ? `: ${c.revokedReason}` : "."}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-accent" /> {certificateTitle(c)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <PenLine className="h-3.5 w-3.5" /> Signatories
              </p>
              {signatories.length === 0 ? (
                <p className="text-sm text-slate-500">No signatories recorded on this certificate.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {signatories.map((s, i) => (
                    <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-sm">
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {s.designation}
                        {s.organization ? ` · ${s.organization}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
            <img src={qrImage} alt="Scan to verify this certificate" className="mx-auto h-40 w-40" />
            <p className="break-all text-xs text-slate-500">{verifyUrl}</p>
            <div className="flex flex-col gap-2">
              {!c.isRevoked && (
                <Button asChild>
                  <a href={`/api/certificates/${c.id}/pdf`}>
                    <Download className="h-4 w-4" /> Download PDF
                  </a>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href={`/verify?certificateNumber=${encodeURIComponent(c.certificateNumber)}`} target="_blank">
                  <ShieldCheck className="h-4 w-4" /> Verify
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
