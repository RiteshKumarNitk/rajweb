import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle, GraduationCap } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getCurrentUser } from "@/security/auth/session";
import { SchoolMembershipForm } from "./school-membership-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "School Membership",
  description:
    "Register your school with the Rajasthan Racquetball Association and introduce racquetball to students across Rajasthan.",
};

const benefits = [
  "School racquetball program support and curriculum guidance",
  "Inter-school tournament participation opportunities",
  "Coach training workshops for physical education staff",
  "Equipment guidance and court setup assistance",
  "Student player registration through official RRA portal",
];

export default async function SchoolMembershipPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/memberships/school");

  return (
    <>
      <PageHeader
        eyebrow="Membership"
        title="School Membership"
        description="Bring racquetball to your school and give students access to structured training and competitive opportunities."
      />
      <PageContent>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>School Registration Form</CardTitle>
              </CardHeader>
              <CardContent>
                <SchoolMembershipForm />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <GraduationCap className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Program Benefits</CardTitle>
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
