import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, Award } from "lucide-react";
import { getCurrentUser } from "@/security/auth/session";
import { VerifyClientPanel } from "./verify-client-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify Certificate",
  description: "Verify Rajasthan Racquetball Association player, coach, and championship certificates.",
};

export default async function AccountVerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ certificateNumber?: string; qrCode?: string }>;
}) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const resolvedParams = searchParams ? await searchParams : {};
  const initialQuery = resolvedParams.certificateNumber || resolvedParams.qrCode || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          Certificate Verification Portal
        </h1>
        <p className="text-sm text-slate-500">
          Verify authentic certificates issued by Rajasthan Racquetball Association with digital signatures.
        </p>
      </div>

      <VerifyClientPanel initialQuery={initialQuery} />
    </div>
  );
}
