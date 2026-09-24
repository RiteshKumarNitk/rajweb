import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Certificate Verification",
  description:
    "Verify the authenticity of RRA-issued player, coach, and membership certificates through the official verification portal.",
};

export default function VerifyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Certificate Verification"
        description="Verify the authenticity of certificates issued by the Rajasthan Racquetball Association."
      />
      <PageContent>
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <ShieldCheck className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Verify Your Certificate</CardTitle>
              <p className="text-sm text-slate-600">
                Enter certificate number, player/coach ID, or scan the QR code from your RRA certificate.
              </p>
            </CardHeader>
            <CardContent>
              <VerifyForm />
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
