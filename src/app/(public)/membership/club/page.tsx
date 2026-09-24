import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, CheckCircle } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getCurrentUser } from "@/security/auth/session";
import { ClubMembershipForm } from "./club-membership-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Club Membership",
  description:
    "Register your racquetball club with the Rajasthan Racquetball Association and join the official state network.",
};

const benefits = [
  "Participation in RRA-sanctioned tournaments and championships",
  "Official club listing on the RRA website and directory",
  "Access to coach certification and training programs",
  "Eligibility for state-level grants and development support",
  "IRA affiliation pathway for registered players",
];

export default async function ClubMembershipPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/memberships/club");

  return (
    <>
      <PageHeader
        eyebrow="Membership"
        title="Club Membership"
        description="Register your racquetball club with RRA and become part of Rajasthan's official racquetball network."
      />
      <PageContent>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Club Registration Form</CardTitle>
              </CardHeader>
              <CardContent>
                <ClubMembershipForm />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Building2 className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Membership Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-2 text-sm text-slate-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  );
}
