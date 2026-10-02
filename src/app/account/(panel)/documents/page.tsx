import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Download, Eye, IdCard, Award } from "lucide-react";
import type { GovernmentIdType } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { GOVERNMENT_ID_LABELS, maskGovernmentIdNumber } from "@/modules/applications/government-id";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Documents",
  description: "Your identity document and the certificates issued to your Rajasthan Racquetball Association account.",
};

const APPLICATION_STATUS: Record<string, string> = {
  PENDING: "Application under review",
  APPROVED: "Application approved",
  REJECTED: "Application returned",
  EXPIRED: "Registration expired",
};

interface IdentityDoc {
  key: string;
  owner: "Player" | "Coach";
  applicationStatus: string;
  type: GovernmentIdType | null;
  number: string | null;
  document: { id: string; fileName: string | null; createdAt: Date } | null;
}

interface IssuedDoc {
  key: string;
  title: string;
  subtitle: string;
  date: Date;
  downloadUrl: string | null;
  viewUrl: string | null;
}

/**
 * The signed-in member's own documents — everything is looked up from the
 * session user id, never from an id in the URL. Files open through routes
 * that check ownership again (/api/media, /api/certificates, /api/files).
 */
export default async function AccountDocumentsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const govSelect = {
    status: true,
    governmentIdType: true,
    governmentIdNumber: true,
    governmentIdDocument: { select: { id: true, fileName: true, createdAt: true } },
  } as const;
  const membershipSelect = { membershipId: true, status: true, certificatePath: true, updatedAt: true } as const;

  const [player, coach, club, school, academy] = await Promise.all([
    prisma.player.findUnique({
      where: { userId: authUser.id },
      select: {
        ...govSelect,
        certificates: {
          where: { isRevoked: false },
          select: { id: true, certificateNumber: true, title: true, eventName: true, tournamentId: true, issuedAt: true },
          orderBy: { issuedAt: "desc" },
        },
      },
    }),
    prisma.coach.findUnique({
      where: { userId: authUser.id },
      select: {
        ...govSelect,
        certificates: {
          where: { isRevoked: false },
          select: { id: true, certificateNumber: true, issuedAt: true, pdfPath: true },
          orderBy: { issuedAt: "desc" },
        },
      },
    }),
    prisma.clubMembership.findUnique({ where: { userId: authUser.id }, select: { ...membershipSelect, clubName: true } }),
    prisma.schoolMembership.findUnique({ where: { userId: authUser.id }, select: { ...membershipSelect, schoolName: true } }),
    prisma.academyMembership.findUnique({ where: { userId: authUser.id }, select: { ...membershipSelect, academyName: true } }),
  ]);

  const storage = getStorage();
  const identity: IdentityDoc[] = [
    ...(player
      ? [{ key: "player", owner: "Player" as const, applicationStatus: player.status, type: player.governmentIdType, number: player.governmentIdNumber, document: player.governmentIdDocument }]
      : []),
    ...(coach
      ? [{ key: "coach", owner: "Coach" as const, applicationStatus: coach.status, type: coach.governmentIdType, number: coach.governmentIdNumber, document: coach.governmentIdDocument }]
      : []),
  ];

  const issued: IssuedDoc[] = [
    ...(player?.certificates ?? []).map((c) => ({
      key: c.id,
      title: c.eventName ? `${c.eventName} — ${c.title ?? "Certificate"}` : (c.title ?? "Player Registration Certificate"),
      subtitle: `Certificate No ${c.certificateNumber} · ${c.tournamentId ? "Tournament certificate" : "Registration certificate"}`,
      date: c.issuedAt,
      downloadUrl: `/api/certificates/${c.id}/pdf`,
      viewUrl: `/account/player/certificates/${c.id}`,
    })),
    ...(coach?.certificates ?? []).map((c) => ({
      key: c.id,
      title: "Coach Certificate",
      subtitle: `Certificate No ${c.certificateNumber}`,
      date: c.issuedAt,
      downloadUrl: c.pdfPath ? storage.getUrl(c.pdfPath) : null,
      viewUrl: null,
    })),
    ...[
      club && { kind: "Club", name: club.clubName, m: club },
      school && { kind: "School", name: school.schoolName, m: school },
      academy && { kind: "Academy", name: academy.academyName, m: academy },
    ]
      .filter((x): x is NonNullable<typeof x> => Boolean(x && x.m.certificatePath))
      .map((x) => ({
        key: x.m.membershipId,
        title: `${x.kind} Membership Certificate`,
        subtitle: `${x.name} · ${x.m.membershipId}`,
        date: x.m.updatedAt,
        downloadUrl: storage.getUrl(x.m.certificatePath!),
        viewUrl: null,
      })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Documents</h1>
        <p className="text-sm text-slate-500">Your identity document and the certificates issued to you.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <IdCard className="h-4 w-4 text-accent" /> Identity Documents
          </CardTitle>
          <CardDescription className="text-xs">Private — only you and the officials reviewing your registration can open them.</CardDescription>
        </CardHeader>
        <CardContent>
          {identity.length === 0 ? (
            <EmptyState title="No documents uploaded yet." description="A Government ID is optional; you can add one when you apply as a Player or Coach." />
          ) : (
            <ul className="divide-y divide-slate-100" data-testid="identity-documents">
              {identity.map((d) => (
                <li key={d.key} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">Government ID — {d.owner} application</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <StatusBadge
                        status={d.document ? "APPROVED" : "EXPIRED"}
                        label={d.document ? "Uploaded" : d.type ? "Number only — no document" : "Not Uploaded"}
                      />
                      {d.type && (
                        <span>
                          {GOVERNMENT_ID_LABELS[d.type]} · <span className="font-mono">{maskGovernmentIdNumber(d.number)}</span>
                        </span>
                      )}
                      {d.document && <span>Uploaded {formatDate(d.document.createdAt)}</span>}
                      <span>· {APPLICATION_STATUS[d.applicationStatus] ?? d.applicationStatus}</span>
                    </div>
                    {d.document?.fileName && <p className="text-xs text-slate-400">{d.document.fileName}</p>}
                    {!d.type && <p className="text-xs text-slate-400">Optional — not provided with your application.</p>}
                  </div>
                  {d.document && (
                    <div className="flex gap-2 self-start sm:self-auto">
                      <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                        <a href={`/api/media/${d.document.id}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                        </a>
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-accent" /> Issued Documents
          </CardTitle>
          <CardDescription className="text-xs">Certificates the association has issued to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {issued.length === 0 ? (
            <EmptyState title="No certificates have been issued to you yet." description="They appear here automatically once the association issues them." />
          ) : (
            <ul className="divide-y divide-slate-100" data-testid="issued-documents">
              {issued.map((doc) => (
                <li key={doc.key} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{doc.title}</p>
                      <p className="text-xs text-slate-400">
                        {doc.subtitle} · Issued {formatDate(doc.date)} · <StatusBadge status="APPROVED" label="Issued" />
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-start sm:self-auto">
                    {doc.viewUrl && (
                      <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                        <Link href={doc.viewUrl}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                        </Link>
                      </Button>
                    )}
                    {doc.downloadUrl ? (
                      <Button size="sm" asChild className="h-8 text-xs">
                        <a href={doc.downloadUrl}>
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">PDF not available</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
