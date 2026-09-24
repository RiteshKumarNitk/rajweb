import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Flag, Trophy } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { rraHistory } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "RRA History",
  description:
    "The history of the Rajasthan Racquetball Association — from its formation in 2025 to its affiliation with the Indian Racquetball Association.",
};

const milestones = [
  {
    year: "1979",
    title: "IRF Formed",
    description: "The International Racquetball Federation was established.",
    icon: GlobeIcon,
  },
  {
    year: "1981",
    title: "World Games",
    description: "Racquetball became a charter member of the World Games.",
    icon: Trophy,
  },
  {
    year: "1985",
    title: "IOC Recognition",
    description: "IRF received recognition from the International Olympic Committee.",
    icon: Flag,
  },
  {
    year: "2023",
    title: "IRA Formed",
    description: "The Indian Racquetball Association was established in India.",
    icon: Calendar,
  },
  {
    year: "2025",
    title: "RRA Established",
    description: "Rajasthan Racquetball Association formed and affiliated with IRA.",
    icon: Trophy,
  },
];

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export default function HistoryPage() {
  const paragraphs = rraHistory.content.trim().split("\n\n");

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={rraHistory.title}
        description="Tracing the journey of racquetball in Rajasthan and the establishment of the state association."
      />
      <PageContent>
        <div className="mb-16 space-y-6">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-lg leading-relaxed text-slate-600">
              {paragraph}
            </p>
          ))}
        </div>

        <h2 className="mb-8 text-2xl font-extrabold text-primary">Key Milestones</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {milestones.map(({ year, title, description, icon: Icon }) => (
            <Card key={year}>
              <CardHeader>
                <span className="text-sm font-bold text-accent">{year}</span>
                <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="mt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline" asChild>
            <Link href="/about/executive-committee">Meet the Executive Committee</Link>
          </Button>
        </div>
      </PageContent>
    </>
  );
}
