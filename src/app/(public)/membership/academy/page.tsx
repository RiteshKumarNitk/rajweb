import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle, Dumbbell } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getCurrentUser } from "@/security/auth/session";
import { AcademyMembershipForm } from "./academy-membership-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academy Membership",
  description:
    "Register your racquetball academy with the Rajasthan Racquetball Association for official recognition and tournament access.",
};

const benefits = [
  "Official academy listing and recognition by RRA",
  "Player development pathway to state and national levels",
  "Coach certification program access and upgrades",
  "Priority registration for RRA training camps",
  "Tournament hosting opportunities for affiliated academies",
];

export default async function AcademyMembershipPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/memberships/academy");

  return (
    <>
      <PageHeader
        eyebrow="Membership"
        title="Academy Membership"
        description="Get your training academy officially affiliated with RRA and unlock development resources for your coaches and players."
      />
      <PageContent>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Academy Registration Form</CardTitle>
              </CardHeader>
              <CardContent>
                <AcademyMembershipForm />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Dumbbell className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Academy Benefits</CardTitle>
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
