import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent } from "@/shared/components/ui/card";
import { CertificateCollection } from "@/shared/components/account/certificate-collection";
import { getOwnCertificates } from "@/modules/certificates/own-certificates.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Certificates",
  description: "Certificates issued to you by the Rajasthan Racquetball Association.",
};

/** The signed-in member's certificate collection (Player and Coach), from issued records only. */
export default async function AccountCertificatesPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");
  const certificates = await getOwnCertificates(authUser.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          <Award className="h-6 w-6 text-accent" /> My Certificates
        </h1>
        <p className="text-sm text-slate-500">Certificates the association has issued to you. Download the PDF at any time.</p>
      </div>
      <Card>
        <CardContent className="p-5">
          <CertificateCollection certificates={certificates} />
        </CardContent>
      </Card>
    </div>
  );
}
