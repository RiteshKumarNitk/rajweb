import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, ExternalLink } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Certificates",
  description: "Certificates issued to your player or coach registration.",
};

export default async function AccountCertificatesPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [player, coach] = await Promise.all([
    prisma.player.findUnique({
      where: { userId: authUser.id },
      include: { certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" } } },
    }),
    prisma.coach.findUnique({
      where: { userId: authUser.id },
      include: { certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" } } },
    }),
  ]);

  const storage = getStorage();
  const playerCerts = player?.certificates ?? [];
  const coachCerts = coach?.certificates ?? [];
  const hasCertificates = playerCerts.length > 0 || coachCerts.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">My Certificates</h1>
        <p className="text-slate-500">Certificates issued against your player or coach registration.</p>
      </div>

      {!hasCertificates ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title="No certificates yet"
              description="Certificates appear here once your player or coach registration is approved and a certificate is issued by the association."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {playerCerts.map((cert) => (
            <Card key={cert.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-5 w-5 text-accent" /> Player Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-slate-500">Certificate No:</span> <span className="font-medium">{cert.certificateNumber}</span></p>
                <p><span className="text-slate-500">Issued:</span> <span className="font-medium">{formatDate(cert.issuedAt)}</span></p>
                {cert.expiresAt && <p><span className="text-slate-500">Valid Until:</span> <span className="font-medium">{formatDate(cert.expiresAt)}</span></p>}
                <div className="flex gap-2 pt-2">
                  {cert.pdfPath && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={storage.getUrl(cert.pdfPath)} target="_blank" rel="noopener noreferrer">
                        View / Download PDF
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/verify?certificateNumber=${cert.certificateNumber}`} target="_blank">
                      Verify <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {coachCerts.map((cert) => (
            <Card key={cert.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-5 w-5 text-accent" /> Coach Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-slate-500">Certificate No:</span> <span className="font-medium">{cert.certificateNumber}</span></p>
                <p><span className="text-slate-500">Issued:</span> <span className="font-medium">{formatDate(cert.issuedAt)}</span></p>
                {cert.expiresAt && <p><span className="text-slate-500">Valid Until:</span> <span className="font-medium">{formatDate(cert.expiresAt)}</span></p>}
                <div className="flex gap-2 pt-2">
                  {cert.pdfPath && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={storage.getUrl(cert.pdfPath)} target="_blank" rel="noopener noreferrer">
                        View / Download PDF
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/verify?certificateNumber=${cert.certificateNumber}`} target="_blank">
                      Verify <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
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
