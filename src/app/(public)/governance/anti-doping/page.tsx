import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Ban, Shield } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Anti-Doping Compliance",
  description:
    "RRA's commitment to clean sport — anti-doping policies aligned with WADA and NADA guidelines for all sanctioned events.",
};

const policies = [
  {
    icon: Shield,
    title: "Clean Sport Commitment",
    content:
      "RRA is committed to protecting the integrity of racquetball and ensuring a level playing field. All athletes, coaches, and support personnel must comply with the World Anti-Doping Code and NADA regulations.",
  },
  {
    icon: Ban,
    title: "Prohibited Substances",
    content:
      "Athletes are responsible for ensuring that no prohibited substance enters their body. The WADA Prohibited List is updated annually. Athletes should check medications and supplements through the Global DRO (Drug Reference Online) tool.",
  },
  {
    icon: AlertTriangle,
    title: "Testing & Consequences",
    content:
      "Doping control may be conducted at any RRA-sanctioned event. Violations result in disqualification, suspension, and potential lifetime bans. RRA reports all anti-doping rule violations to NADA and IRA.",
  },
];

const responsibilities = [
  "Know and comply with anti-doping rules",
  "Check all medications and supplements before use",
  "Cooperate with doping control officers when requested",
  "Report any suspected doping violations to RRA",
  "Complete anti-doping education modules when required",
  "Inform RRA of any Therapeutic Use Exemptions (TUE)",
];

export default function AntiDopingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Anti-Doping Compliance"
        description="RRA upholds the highest standards of clean sport in alignment with WADA and NADA regulations."
      />
      <PageContent>
        <div className="mb-12 grid gap-6 lg:grid-cols-3">
          {policies.map(({ icon: Icon, title, content }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Icon className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Athlete Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {responsibilities.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="mt-12 flex flex-wrap gap-4">
          <Button asChild>
            <a href="https://www.wada-ama.org" target="_blank" rel="noopener noreferrer">
              WADA Resources
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/about/rules-policies">Rules & Policies</Link>
          </Button>
        </div>
      </PageContent>
    </>
  );
}
