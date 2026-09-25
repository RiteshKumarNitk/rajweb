import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck, Award } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Certificate Verification",
  description:
    "Verify the authenticity of Rajasthan Racquetball Association issued player, coach, and championship certificates.",
};

export default function VerifyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Official Federation Portal"
        title="Certificate Verification"
        description="Verify the authenticity and merit ranking of certificates issued by the Rajasthan Racquetball Association."
      />
      <PageContent>
        <div className="mx-auto max-w-4xl">
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading verification portal...</div>}>
            <VerifyForm />
          </Suspense>
        </div>
      </PageContent>
    </>
  );
}
