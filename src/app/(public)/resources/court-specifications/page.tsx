import type { Metadata } from "next";
import { courtSpecifications, siteImages } from "@/shared/config/site";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MediaImage } from "@/shared/components/ui/media-image";
import { MediaImageSlider } from "@/shared/components/ui/media-image-slider";

export const metadata: Metadata = {
  title: "Court Specifications",
  description:
    "Official indoor and outdoor racquetball court specifications as per IRF standards for clubs, schools, and academies in Rajasthan.",
};

function CourtSpecCard({
  title,
  image,
  images,
  dimensions,
  features,
}: {
  title: string;
  image?: string;
  images?: string[];
  dimensions: Record<string, string>;
  features: string[];
}) {
  return (
    <Card className="overflow-hidden">
      {images && images.length > 0 ? (
        <MediaImageSlider images={images} alt={title} />
      ) : image ? (
        <MediaImage src={image} alt={title} aspect="video" fit="cover" rounded={false} />
      ) : null}
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary">Dimensions</h4>
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(dimensions).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-medium uppercase text-slate-500">{key}</dt>
                <dd className="mt-1 font-semibold text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary">Features & Requirements</h4>
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CourtSpecificationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Court Specifications"
        description="Standard court dimensions and requirements for indoor and outdoor racquetball facilities in Rajasthan."
      />
      <PageContent>
        <p className="mb-10 max-w-3xl text-lg leading-relaxed text-slate-600">
          All RRA-affiliated clubs, schools, and academies should ensure their courts meet these
          specifications aligned with International Racquetball Federation (IRF) standards. Proper
          court construction ensures fair play and player safety.
        </p>
        <div className="grid gap-8 lg:grid-cols-2">
          <CourtSpecCard
            title={courtSpecifications.indoor.title}
            images={siteImages.court.indoorSlider}
            dimensions={courtSpecifications.indoor.dimensions}
            features={courtSpecifications.indoor.features}
          />
          <CourtSpecCard
            title={courtSpecifications.outdoor.title}
            images={siteImages.court.outdoorSlider}
            dimensions={courtSpecifications.outdoor.dimensions}
            features={courtSpecifications.outdoor.features}
          />
        </div>
      </PageContent>
    </>
  );
}
