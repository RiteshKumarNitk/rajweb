import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { LogoImage } from "@/shared/components/ui/media-image";
import { rajasthanDistricts, districtLogos } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "District Associations",
  description:
    "Explore district racquetball associations across all 33 districts of Rajasthan affiliated with the Rajasthan Racquetball Association.",
};

export default function DistrictsPage() {
  const featuredDistricts = Object.keys(districtLogos);

  return (
    <>
      <PageHeader
        eyebrow="Network"
        title="District Associations"
        description="RRA is building a statewide network of district associations to promote racquetball in every corner of Rajasthan."
      />
      <PageContent>
        <p className="mb-10 max-w-3xl text-lg leading-relaxed text-slate-600">
          Each district association works under the guidance of RRA to organize local tournaments,
          player development programs, and coach training initiatives. Contact your district
          representative to get involved in racquetball near you.
        </p>

        {featuredDistricts.length > 0 && (
          <section className="mb-14">
            <h2 className="mb-6 text-xl font-bold text-primary">Affiliated District Chapters</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredDistricts.map((district) => (
                <Card key={district} className="overflow-hidden text-center">
                  <CardContent className="flex flex-col items-center gap-4 p-6">
                    <div className="flex h-28 w-28 items-center justify-center">
                      <LogoImage
                        src={districtLogos[district]}
                        alt={`${district} Racquetball Association`}
                        maxHeight={112}
                        maxWidth={112}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-primary">{district}</p>
                      <p className="text-sm text-slate-500">District Racquetball Association</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <h2 className="mb-6 text-xl font-bold text-primary">All Rajasthan Districts</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {rajasthanDistricts.map((district) => (
            <Card key={district} className="group hover:border-secondary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  {districtLogos[district] ? (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <LogoImage
                        src={districtLogos[district]}
                        alt={district}
                        maxHeight={40}
                        maxWidth={40}
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 group-hover:bg-secondary/10">
                      <MapPin className="h-5 w-5 text-primary group-hover:text-secondary" />
                    </div>
                  )}
                  <CardTitle className="text-base">{district}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  {districtLogos[district] ? "Affiliated chapter" : "District Association — Rajasthan"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-primary p-8 text-center text-white md:p-12">
          <h2 className="text-2xl font-extrabold">Start a District Chapter</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Interested in establishing or leading a racquetball association in your district?
            Contact RRA to learn about affiliation requirements and support available.
          </p>
          <Button variant="accent" className="mt-6" asChild>
            <Link href="/contact">Contact RRA</Link>
          </Button>
        </div>
      </PageContent>
    </>
  );
}
