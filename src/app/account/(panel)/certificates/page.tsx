import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, ExternalLink, Download, ShieldCheck, CheckCircle2, FileText, UserCheck, GraduationCap } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Certificates",
  description: "Official digital certificates issued by Rajasthan Racquetball Association.",
};

export default async function AccountCertificatesPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [player, coach] = await Promise.all([
    prisma.player.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      include: { certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" } } },
    }),
    prisma.coach.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      include: { certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" } } },
    }),
  ]);

  const storage = getStorage();
  const playerCerts = player?.certificates ?? [];
  const coachCerts = coach?.certificates ?? [];
  const hasCertificates = playerCerts.length > 0 || coachCerts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Certificates</h1>
          <p className="text-sm text-slate-500">
            Official digital player and coach credentials issued by Rajasthan Racquetball Association.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
          <Link href="/verify" target="_blank" className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verify Any Certificate
          </Link>
        </Button>
      </div>

      {!hasCertificates ? (
        <Card className="border-dashed">
          <CardContent className="p-8">
            <EmptyState
              title="No certificates issued yet"
              description="Official certificates appear here once your Player or Coach registration is reviewed and approved by the state association committee."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button asChild size="sm" className="bg-primary text-white hover:bg-slate-800">
                    <Link href="/account/player" className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" /> Player Registration
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/account/coach" className="flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" /> Coach Registration
                    </Link>
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {playerCerts.map((cert) => (
            <Card
              key={cert.id}
              className="overflow-hidden border-slate-200/80 transition-all hover:border-amber-400/80 hover:shadow-md"
            >
              <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-amber-400" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Player Certificate</CardTitle>
                      <CardDescription className="text-xs">Rajasthan Racquetball Association</CardDescription>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Valid
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-3 space-y-1.5 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Certificate No:</span>
                    <span className="font-mono font-bold text-slate-800">{cert.certificateNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Issued On:</span>
                    <span className="font-medium text-slate-700">{formatDate(cert.issuedAt)}</span>
                  </div>
                  {cert.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Valid Until:</span>
                      <span className="font-medium text-slate-700">{formatDate(cert.expiresAt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {cert.pdfPath && (
                    <Button variant="outline" size="sm" asChild className="flex-1 text-xs">
                      <a href={storage.getUrl(cert.pdfPath)} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild className="text-xs text-primary hover:bg-slate-100">
                    <Link href={`/verify?certificateNumber=${cert.certificateNumber}`} target="_blank">
                      Verify <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {coachCerts.map((cert) => (
            <Card
              key={cert.id}
              className="overflow-hidden border-slate-200/80 transition-all hover:border-amber-400/80 hover:shadow-md"
            >
              <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Coach Certificate</CardTitle>
                      <CardDescription className="text-xs">Certified State Coach</CardDescription>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Valid
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-3 space-y-1.5 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Certificate No:</span>
                    <span className="font-mono font-bold text-slate-800">{cert.certificateNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Issued On:</span>
                    <span className="font-medium text-slate-700">{formatDate(cert.issuedAt)}</span>
                  </div>
                  {cert.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Valid Until:</span>
                      <span className="font-medium text-slate-700">{formatDate(cert.expiresAt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {cert.pdfPath && (
                    <Button variant="outline" size="sm" asChild className="flex-1 text-xs">
                      <a href={storage.getUrl(cert.pdfPath)} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild className="text-xs text-primary hover:bg-slate-100">
                    <Link href={`/verify?certificateNumber=${cert.certificateNumber}`} target="_blank">
                      Verify <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
