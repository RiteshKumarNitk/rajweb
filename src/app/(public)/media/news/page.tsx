import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export const metadata: Metadata = {
  title: "News",
  description:
    "Latest news, announcements, and updates from the Rajasthan Racquetball Association.",
};

const newsItems = [
  {
    title: "RRA Affiliated with Indian Racquetball Association",
    date: "January 2025",
    excerpt:
      "The Rajasthan Racquetball Association has received official affiliation from the Indian Racquetball Association, marking a significant milestone for the sport in the state.",
    category: "Announcement",
  },
  {
    title: "Rajasthan State Championship Dates Announced",
    date: "February 2025",
    excerpt:
      "The 2025 Rajasthan State Racquetball Championship will be held in Jaipur from March 15–17. Registration is now open for all categories.",
    category: "Tournament",
  },
  {
    title: "Coach Certification Program Launched",
    date: "February 2025",
    excerpt:
      "RRA launches its first Level 1 Coach Certification program in partnership with IRA. Applications are open for experienced coaches across Rajasthan.",
    category: "Development",
  },
  {
    title: "Inter-District League Phase 1 Begins",
    date: "February 2025",
    excerpt:
      "The first phase of the RRA Inter-District League kicks off with teams from Jaipur, Jodhpur, Udaipur, and Kota competing for the top spot.",
    category: "League",
  },
  {
    title: "New District Associations Formed",
    date: "January 2025",
    excerpt:
      "Five new district racquetball associations have been established in Ajmer, Bikaner, Sikar, Bharatpur, and Alwar, expanding RRA's statewide network.",
    category: "Development",
  },
  {
    title: "Youth Development Camp a Success in Jodhpur",
    date: "December 2024",
    excerpt:
      "Over 60 young players participated in the RRA Youth Development Camp in Jodhpur, receiving training from certified coaches and state-level players.",
    category: "Event",
  },
];

export default function NewsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Media"
        title="News & Updates"
        description="Stay informed with the latest announcements, tournament updates, and development news from RRA."
      />
      <PageContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {newsItems.map((item) => (
            <Card key={item.title} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {item.date}
                  </span>
                </div>
                <CardTitle className="mt-4 line-clamp-2">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="flex-1 text-sm leading-relaxed text-slate-600">{item.excerpt}</p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-secondary/80"
                >
                  Read more <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContent>
    </>
  );
}
