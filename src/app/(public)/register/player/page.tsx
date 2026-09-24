import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserCheck } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getCurrentUser } from "@/security/auth/session";
import { PlayerRegistrationForm } from "./player-registration-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Player Registration",
  description:
    "Register as an official player with the Rajasthan Racquetball Association and compete in sanctioned state tournaments.",
};

export default async function PlayerRegistrationPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/player");

  return (
    <>
      <PageHeader
        eyebrow="Registration"
        title="Player Registration"
        description="Register with RRA to participate in official state tournaments, ranking events, and selection trials."
      />
      <PageContent>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Player Registration Form</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerRegistrationForm />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <UserCheck className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Registration Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>• Valid Aadhar number for identity verification</li>
                <li>• Age category determined by date of birth</li>
                <li>• Protective eyewear mandatory for all events</li>
                <li>• Annual registration fee applies upon approval</li>
                <li>• Players under 18 require guardian consent</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
