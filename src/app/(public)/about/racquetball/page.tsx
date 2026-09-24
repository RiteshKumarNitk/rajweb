import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Medal, Users } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { MediaImage } from "@/shared/components/ui/media-image";
import { aboutRacquetball, siteImages } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "About Racquetball",
  description:
    "Learn about racquetball — a globally recognised racquet sport with IOC recognition since 1985, and its growth in Rajasthan through RRA.",
};

const highlights = [
  {
    icon: Globe,
    title: "Global Recognition",
    description:
      "The International Racquetball Federation (IRF) was recognized by the IOC in 1985 — one of the youngest sports ever to receive this honour.",
  },
  {
    icon: Medal,
    title: "World Games & Continental Games",
    description:
      "Racquetball was a charter member of the World Games in 1981 and has featured in five IOC-Recognized Continental Games since 1995.",
  },
  {
    icon: Users,
    title: "Growing in India",
    description:
      "The Indian Racquetball Association (IRA) was formed in 2023. RRA was established in 2025 and affiliated with IRA in the same year.",
  },
];

export default function AboutRacquetballPage() {
  const paragraphs = aboutRacquetball.content.trim().split("\n\n");

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={aboutRacquetball.title}
        description="Discover the sport of racquetball — its history, global standing, and development across Rajasthan."
      />
      <PageContent>
        <MediaImage
          src={siteImages.about}
          alt="Rajasthan Racquetball Association official banner and affiliations"
          aspect="video"
          fit="contain"
          priority
          containerClassName="mb-10 bg-white ring-1 ring-slate-200"
        />
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-lg leading-relaxed text-slate-600">
                {paragraph}
              </p>
            ))}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button asChild>
                <Link href="/register/player">Register as Player</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/about/history">RRA History</Link>
              </Button>
            </div>
          </div>
          <div className="space-y-6">
            {highlights.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
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
        </div>
      </PageContent>
    </>
  );
}
