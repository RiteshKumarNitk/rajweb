import Link from "next/link";
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  ExternalLink,
  Users,
  Sparkles,
  PenTool,
  QrCode,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { playerCertDistrictWhere, coachCertDistrictWhere } from "@/security/rbac/district-scope";
import { hasPermission } from "@/security/rbac/permissions";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { IssueCertificateButton } from "@/shared/components/admin/issue-certificate-button";
import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { Button } from "@/shared/components/ui/button";
import {
  OFFICIAL_SIGNATORIES,
  SAMPLE_CHAMPIONSHIP_CERTIFICATES,
  type CertificateVerificationResult,
} from "@/modules/verify/verify.service";

async function getCertificates(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const [playerCerts, coachCerts] = await Promise.all([
      prisma.playerCertificate.findMany({
        where: playerCertDistrictWhere(districtId),
        include: { player: { include: { district: true } } },
        orderBy: { issuedAt: "desc" },
        take: 50,
      }),
      prisma.coachCertificate.findMany({
        where: coachCertDistrictWhere(districtId),
        include: { coach: { include: { district: true } } },
        orderBy: { issuedAt: "desc" },
        take: 50,
      }),
    ]);
    return { playerCerts, coachCerts };
  } catch {
    return { playerCerts: [], coachCerts: [] };
  }
}

async function getEligiblePlayers(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const players = await prisma.player.findMany({
      where: {
        status: "APPROVED",
        ...(districtId ? { districtId } : {}),
        certificates: { none: { isRevoked: false } },
      },
      include: { district: true },
      orderBy: { name: "asc" },
    });
    return players.map((p) => ({
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      email: p.email,
      district: p.district.name,
    }));
  } catch {
    return [];
  }
}

type PlayerCertWithPlayer = Awaited<ReturnType<typeof getCertificates>>["playerCerts"][number];
type CoachCertWithCoach = Awaited<ReturnType<typeof getCertificates>>["coachCerts"][number];

export default async function AdminCertificatesPage() {
  const { districtId, user } = await requireAdminScope(PERMISSIONS.CERTIFICATES_READ);
  const [{ playerCerts, coachCerts }, eligiblePlayers] = await Promise.all([
    getCertificates(districtId),
    getEligiblePlayers(districtId),
  ]);
  const storage = getStorage();
  const canIssue = hasPermission(user, PERMISSIONS.CERTIFICATES_ISSUE);

  const playerColumns: ColumnDef<PlayerCertWithPlayer>[] = [
    {
      header: "Cert No.",
      accessorKey: "certificateNumber",
      className: "font-mono text-xs font-bold text-slate-900",
    },
    { header: "Player", cell: (c) => c.player.name },
    { header: "District", cell: (c) => c.player.district?.name ?? "Rajasthan" },
    {
      header: "Signatories",
      cell: () => (
        <span className="text-[11px] text-slate-600">
          President: {OFFICIAL_SIGNATORIES.president.name} & Gen. Sec: {OFFICIAL_SIGNATORIES.generalSecretary.name}
        </span>
      ),
    },
    { header: "Issued", cell: (c) => formatDate(c.issuedAt) },
    {
      header: "Actions",
      cell: (c) => (
        <div className="flex items-center gap-2">
          {c.pdfPath && (
            <a
              href={storage.getUrl(c.pdfPath)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              PDF
            </a>
          )}
          <Link
            href={`/account/verify?certificateNumber=${encodeURIComponent(c.certificateNumber)}`}
            target="_blank"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-0.5"
          >
            Verify <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ),
    },
  ];

  const coachColumns: ColumnDef<CoachCertWithCoach>[] = [
    {
      header: "Cert No.",
      accessorKey: "certificateNumber",
      className: "font-mono text-xs font-bold text-slate-900",
    },
    { header: "Coach", cell: (c) => c.coach.name },
    { header: "District", cell: (c) => c.coach.district?.name ?? "Rajasthan" },
    {
      header: "Signatories",
      cell: () => (
        <span className="text-[11px] text-slate-600">
          President: {OFFICIAL_SIGNATORIES.president.name} & Gen. Sec: {OFFICIAL_SIGNATORIES.generalSecretary.name}
        </span>
      ),
    },
    { header: "Issued", cell: (c) => formatDate(c.issuedAt) },
    {
      header: "Actions",
      cell: (c) => (
        <div className="flex items-center gap-2">
          {c.pdfPath && (
            <a
              href={storage.getUrl(c.pdfPath)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              PDF
            </a>
          )}
          <Link
            href={`/account/verify?certificateNumber=${encodeURIComponent(c.certificateNumber)}`}
            target="_blank"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-0.5"
          >
            Verify <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ),
    },
  ];

  const sampleChampionshipColumns: ColumnDef<CertificateVerificationResult>[] = [
    {
      header: "Serial No.",
      cell: (c) => <span className="font-mono text-xs font-bold text-pink-700">{c.certificateNumber}</span>,
    },
    {
      header: "Candidate & Guardian",
      cell: (c) => (
        <div>
          <p className="font-semibold text-slate-900">{c.name}</p>
          <p className="text-[11px] text-slate-500">S/D of {c.fatherName}</p>
        </div>
      ),
    },
    { header: "District", accessorKey: "district" },
    {
      header: "Category & Event",
      cell: (c) => (
        <span className="text-xs font-medium text-slate-700">
          {c.category} · {c.event}
        </span>
      ),
    },
    {
      header: "Position",
      cell: (c) => (
        <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[11px] font-extrabold text-pink-800 border border-pink-200">
          {c.position}
        </span>
      ),
    },
    {
      header: "Authorized Signers",
      cell: () => (
        <div className="text-[11px] text-slate-600">
          <p>President: <strong className="text-slate-800">{OFFICIAL_SIGNATORIES.president.name}</strong></p>
          <p>Gen. Sec: <strong className="text-slate-800">{OFFICIAL_SIGNATORIES.generalSecretary.name}</strong></p>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (c) => (
        <Button size="sm" variant="outline" asChild className="h-7 text-xs border-pink-200 text-pink-700 hover:bg-pink-50">
          <Link href={`/account/verify?certificateNumber=${encodeURIComponent(c.certificateNumber)}`} target="_blank">
            Verify & Preview <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Certificates & Signatures Management
          </h1>
          <p className="text-sm text-slate-500">
            Issue, verify, and track official digital credentials and authorized federation signatures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/account/verify" target="_blank" className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Open Verification Portal
            </Link>
          </Button>
          {canIssue && <IssueCertificateButton players={eligiblePlayers} label="Issue Certificate" />}
        </div>
      </div>

      {/* Official Signatories & Digital Signature Registry Card */}
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
                <PenTool className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-white">Authorized Federation Signatories</CardTitle>
                <CardDescription className="text-xs text-slate-300">
                  Digital signers affixed to state certificates and championship merits
                </CardDescription>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3" /> Signatures Active
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* President */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Primary Authority</span>
                <span className="font-mono text-[10px] text-emerald-400">Digitally Verified</span>
              </div>
              <p className="text-base font-black text-white">{OFFICIAL_SIGNATORIES.president.name}</p>
              <p className="text-xs font-semibold text-pink-300">{OFFICIAL_SIGNATORIES.president.title}</p>
              <p className="text-[11px] text-slate-400">{OFFICIAL_SIGNATORIES.president.organization}</p>
            </div>

            {/* General Secretary */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Executive Authority</span>
                <span className="font-mono text-[10px] text-emerald-400">Digitally Verified</span>
              </div>
              <p className="text-base font-black text-white">{OFFICIAL_SIGNATORIES.generalSecretary.name}</p>
              <p className="text-xs font-semibold text-pink-300">{OFFICIAL_SIGNATORIES.generalSecretary.title}</p>
              <p className="text-[11px] text-slate-400">{OFFICIAL_SIGNATORIES.generalSecretary.organization}</p>
            </div>

            {/* Organizing Committee */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs space-y-1.5 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Host Association</span>
                <span className="font-mono text-[10px] text-amber-300">Sanctioned</span>
              </div>
              <p className="text-base font-black text-white">Jaipur Racquetball Association</p>
              <p className="text-xs font-semibold text-amber-300">Organizing Committee</p>
              <p className="text-[11px] text-slate-400">Sub-Junior / Junior / Senior State Championship</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* State Championship Certificates & Test Dummy Data */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            State Championship Certificates & Demo Records ({SAMPLE_CHAMPIONSHIP_CERTIFICATES.length})
          </CardTitle>
          <Button size="sm" variant="outline" asChild className="text-xs">
            <Link href="/account/verify" target="_blank">
              Test in Verification Portal <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-3 rounded-md bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Active Test Records for Official Verification:
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              These certificates match the official state championship template and verify instantly across both the admin portal and public verification page.
            </p>
          </div>
          <DataTable
            data={SAMPLE_CHAMPIONSHIP_CERTIFICATES}
            columns={sampleChampionshipColumns}
            keyExtractor={(c) => c.certificateNumber}
          />
        </CardContent>
      </Card>

      {/* Player & Coach Certificate Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title={`Player Registration Certificates (${playerCerts.length})`}>
          <DataTable
            data={playerCerts}
            columns={playerColumns}
            keyExtractor={(c) => c.id}
            emptyTitle="No player certificates issued yet"
          />
        </DashboardCard>
        <DashboardCard title={`Coach Registration Certificates (${coachCerts.length})`}>
          <DataTable
            data={coachCerts}
            columns={coachColumns}
            keyExtractor={(c) => c.id}
            emptyTitle="No coach certificates issued yet"
          />
        </DashboardCard>
      </div>
    </div>
  );
}
