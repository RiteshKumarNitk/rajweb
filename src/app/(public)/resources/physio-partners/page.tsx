import type { Metadata } from "next";
// import { MapPin, Phone } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ComingSoonBanner } from "@/shared/components/ui/coming-soon-banner";
// import { MediaImage } from "@/shared/components/ui/media-image";
// import { physioPartners, siteImages } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Physio Partners",
  description:
    "RRA's official physiotherapy partner ABPT — sports injury prevention, treatment, and rehabilitation for racquetball athletes.",
};

export default function PhysioPartnersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Physio Partners"
        description="Official physiotherapy partners supporting RRA athletes with injury prevention, treatment, and recovery services."
      />
      <PageContent>
        <ComingSoonBanner feature="Physio partners" />
        {/* <MediaImage
          src={siteImages.rra.leadershipCardsBanner}
          alt="Rajasthan Racquetball Association official banner and affiliations"
          aspect="wide"
          fit="contain"
          containerClassName="mb-10 bg-white ring-1 ring-slate-200"
          sizes="(max-width: 1200px) 100vw, 1024px"
        />

        <p className="mb-12 max-w-3xl text-lg leading-relaxed text-slate-600">
          RRA collaborates with ABPT — High Performance Sports Science Centre as its official
          physiotherapy partner. Registered RRA members receive professional sports science and
          recovery support for training and tournaments.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {physioPartners.map((partner) => (
            <Card key={partner.name} className="overflow-hidden transition-all hover:shadow-md">
              <div className="relative p-2 pb-0">
                <MediaImage
                  src={partner.photo}
                  alt={partner.name}
                  aspect="square"
                  fit="cover"
                  rounded={true}
                  className="object-top shadow-sm"
                />
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-primary">{partner.name}</CardTitle>
                <p className="text-sm font-semibold text-secondary">{partner.role}</p>
                <p className="mt-1 text-xs text-slate-500">{partner.organization}</p>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                      <MapPin className="h-4 w-4 text-accent" />
                    </div>
                    {partner.location}, Rajasthan
                  </div>
                  <a
                    href={`tel:${partner.phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-3 text-sm text-slate-700 hover:text-secondary transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                      <Phone className="h-4 w-4 text-accent" />
                    </div>
                    {partner.phone}
                  </a>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Services</h4>
                  <ul className="space-y-2">
                    {partner.services.map((service) => (
                      <li key={service} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/60" />
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div> */}
      </PageContent>
    </>
  );
}
