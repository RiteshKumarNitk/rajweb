import type { Metadata } from "next";
import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { CertificateCollection } from "@/shared/components/account/certificate-collection";
import { getOwnCertificates } from "@/modules/certificates/own-certificates.server";
import { requireOwnPlayer } from "../require-own-player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Certificates" };

/** The player's own certificates (session player only): View Certificate and Download PDF. */
export default async function PlayerCertificatesPage() {
  const { authUser } = await requireOwnPlayer();
  const certificates = await getOwnCertificates(authUser.id, { kinds: ["player"] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-accent" /> My Certificates
        </CardTitle>
        <CardDescription className="text-xs">Certificates issued to you by the association</CardDescription>
      </CardHeader>
      <CardContent>
        <CertificateCollection certificates={certificates} />
      </CardContent>
    </Card>
  );
}
