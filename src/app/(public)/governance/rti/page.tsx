import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Scale, Users } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { siteConfig } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "RTI & Governance",
  description:
    "Right to Information (RTI) and governance information for the Rajasthan Racquetball Association.",
};

const rtiInfo = [
  {
    title: "Public Information Officer (PIO)",
    content: `The Public Information Officer for RRA handles all RTI requests. Submit your application in writing to ${siteConfig.email} or by post to the registered office address.`,
  },
  {
    title: "First Appellate Authority",
    content: "Appeals against PIO decisions may be filed with the First Appellate Authority within 30 days of the PIO's response or within 30 days of the expiry of the response period.",
  },
  {
    title: "Information Available",
    content: "RRA maintains records of membership, tournament results, financial statements, executive committee decisions, and affiliation documents as per RTI Act requirements.",
  },
];

const governance = [
  {
    icon: Scale,
    title: "Constitutional Framework",
    description: "RRA operates under its constitution and bylaws, aligned with IRA and state sports federation guidelines.",
  },
  {
    icon: Users,
    title: "Democratic Governance",
    description: "Executive committee members are elected through a transparent process with defined term limits.",
  },
  {
    icon: FileText,
    title: "Financial Transparency",
    description: "Annual financial reports are maintained and available for inspection as per regulatory requirements.",
  },
];

export default function RTIPage() {
  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="RTI & Governance"
        description="Transparency and accountability in the governance of the Rajasthan Racquetball Association."
      />
      <PageContent>
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {governance.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/5">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mb-6 text-2xl font-extrabold text-primary">Right to Information (RTI)</h2>
        <div className="space-y-6">
          {rtiInfo.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{item.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/contact">Submit RTI Request</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/about/executive-committee">Executive Committee</Link>
          </Button>
        </div>
      </PageContent>
    </>
  );
}
