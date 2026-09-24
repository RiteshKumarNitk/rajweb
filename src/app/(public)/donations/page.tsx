import type { Metadata } from "next";
import { Heart, Target, Users } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { DonationForm } from "./donation-form";

export const metadata: Metadata = {
  title: "Donations",
  description:
    "Support the Rajasthan Racquetball Association through donations for youth development, court construction, and tournament programs.",
};

const impactAreas = [
  {
    icon: Users,
    title: "Youth Development",
    description: "Fund grassroots training programs and school racquetball initiatives across Rajasthan.",
  },
  {
    icon: Target,
    title: "Court Construction",
    description: "Help build and maintain racquetball courts in underserved districts and communities.",
  },
  {
    icon: Heart,
    title: "Tournament Support",
    description: "Sponsor state championships and provide equipment for competitive events.",
  },
];

export default function DonationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Support RRA"
        title="Donations"
        description="Your contribution helps build racquetball infrastructure and develop the next generation of champions in Rajasthan."
      />
      <PageContent>
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {impactAreas.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Icon className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Make a Donation</CardTitle>
            <p className="text-sm text-slate-600">
              Complete the form below to pledge your support. Our team will contact you with payment
              details. Donations may be eligible for tax benefits under applicable regulations.
            </p>
          </CardHeader>
          <CardContent>
            <DonationForm />
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
