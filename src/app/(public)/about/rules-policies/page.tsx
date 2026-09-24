import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Shield, Users } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Rules & Policies",
  description:
    "Official rules, policies, and guidelines of the Rajasthan Racquetball Association for members, players, coaches, and affiliated institutions.",
};

const policies = [
  {
    icon: FileText,
    title: "Membership Policy",
    items: [
      "All clubs, schools, and academies must register with RRA before participating in official events.",
      "Membership is valid for one calendar year and subject to annual renewal.",
      "Members must maintain active status with IRA affiliation requirements.",
      "Membership fees are non-refundable once processing is complete.",
    ],
  },
  {
    icon: Users,
    title: "Player Registration",
    items: [
      "All players must register through the official RRA portal before competing in sanctioned events.",
      "Age verification documents are required for junior and sub-junior categories.",
      "Players must comply with IRA and IRF competition rules during all tournaments.",
      "Transfer between districts requires prior approval from RRA.",
    ],
  },
  {
    icon: Shield,
    title: "Code of Conduct",
    items: [
      "All participants must uphold sportsmanship and fair play at all times.",
      "Discrimination, harassment, or unsportsmanlike behaviour will result in disciplinary action.",
      "Doping violations are handled per WADA and NADA guidelines — see Anti-Doping page.",
      "Appeals must be submitted in writing within 7 days of any disciplinary decision.",
    ],
  },
];

const documents = [
  { name: "RRA Constitution & Bylaws", status: "Available on request" },
  { name: "Tournament Regulations", status: "Updated 2025" },
  { name: "Coach Certification Guidelines", status: "IRA Aligned" },
  { name: "Privacy Policy", status: "Effective 2025", href: "/governance/privacy-policy" },
];

export default function RulesPoliciesPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Rules & Policies"
        description="Guidelines and policies governing membership, competition, and conduct within the Rajasthan Racquetball Association."
      />
      <PageContent>
        <div className="grid gap-8 lg:grid-cols-3">
          {policies.map(({ icon: Icon, title, items }) => (
            <Card key={title}>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-extrabold text-primary">Official Documents</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-6 py-4 font-semibold">Document</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={doc.name} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-6 py-4 font-medium text-primary">
                      {"href" in doc && doc.href ? (
                        <Link href={doc.href} className="text-secondary hover:underline">
                          {doc.name}
                        </Link>
                      ) : (
                        doc.name
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{doc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/governance/anti-doping">Anti-Doping Compliance</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/governance/rti">RTI & Governance</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/governance/privacy-policy">Privacy Policy</Link>
          </Button>
        </div>
      </PageContent>
    </>
  );
}
