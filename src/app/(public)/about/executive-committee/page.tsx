import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MediaImage } from "@/shared/components/ui/media-image";
import { siteConfig, executiveCommittee } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Executive Committee",
  description:
    "Meet the executive committee of the Rajasthan Racquetball Association — the leadership team guiding racquetball development across Rajasthan.",
};

export default function ExecutiveCommitteePage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Executive Committee"
        description="The elected leadership team responsible for governing and promoting racquetball across Rajasthan."
      />
      <PageContent>
        {/* <MediaImage
          src={siteImages.rra.leadershipBanner}
          alt="Rajasthan Racquetball Association official banner and affiliations"
          aspect="wide"
          fit="contain"
          containerClassName="mb-12 bg-white ring-1 ring-slate-200"
          sizes="(max-width: 1200px) 100vw, 1024px"
        /> */}

        <p className="mb-12 max-w-3xl text-lg leading-relaxed text-slate-600">
          The Executive Committee of the Rajasthan Racquetball Association comprises experienced sports
          administrators, coaches, and community leaders committed to building a world-class racquetball
          ecosystem in the state. Committee members serve voluntary terms and work in alignment with IRA
          and IRF guidelines.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {executiveCommittee.map((member) => (
            <Card key={`${member.role}-${member.name}`} className="overflow-hidden">
              <MediaImage
                src={member.photo}
                alt={member.name}
                aspect="portrait"
                fit="cover"
                rounded={false}
                className="object-top"
              />
              <CardHeader>
                <CardTitle className="text-lg">{member.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {member.positions ? (
                    <div className="space-y-2">
                      {member.positions.map((position) => (
                        <div key={`${position.role}-${position.organization}`}>
                          <p className="text-sm font-semibold text-secondary">{position.role}</p>
                          <p className="text-xs text-slate-500">{position.organization}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-secondary">{member.role}</p>
                  )}
                  {"badge" in member && member.badge ? (
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {member.badge}
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{member.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-12 bg-primary text-white">
          <CardContent className="flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">Contact the Committee</h3>
              <p className="mt-2 text-slate-300">
                For official inquiries regarding governance, partnerships, or committee matters.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-2 text-accent hover:text-white"
              >
                <Mail className="h-4 w-4" />
                {siteConfig.email}
              </a>
              <a
                href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-accent hover:text-white"
              >
                <Phone className="h-4 w-4" />
                {siteConfig.phone}
              </a>
            </div>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
