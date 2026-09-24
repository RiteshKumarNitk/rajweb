import type { Metadata } from "next";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { MediaImage } from "@/shared/components/ui/media-image";
import { siteImages } from "@/shared/config/site";
import { EquipmentSection } from "./equipment-section";

export const metadata: Metadata = {
  title: "Equipment Information",
  description:
    "Essential racquetball equipment guide — racquets, balls, eyewear, and gear recommendations for players at all levels.",
};

const equipment = [
  {
    title: "Racquetball Racquet",
    image: siteImages.equipment.racquet,
    description: "High-quality racquetball racquets suitable for training, tournaments, and competitive play.",
    details: [
      "Designed for excellent grip, balance, and control",
      "Suitable for beginners, intermediate, and advanced players",
      "Manufactured using durable materials for long-term performance",
      "Ideal for both practice sessions and official matches",
    ],
  },
  {
    title: "Protective Glasses",
    image: siteImages.equipment.eyewear,
    description: "Player safety is our priority. Protective racquetball eyewear that meets safety requirements.",
    details: [
      "Shatter-resistant lenses for maximum eye protection",
      "Comfortable fit for long matches and training sessions",
      "Clear visibility without distortion",
      "Mandatory for all sanctioned RRA and IRA competitions",
    ],
  },
  {
    title: "Racquetball Balls",
    image: siteImages.equipment.balls,
    description: "Standard racquetball balls designed for indoor courts and competitive play.",
    details: [
      "Consistent bounce and speed",
      "Suitable for training sessions and tournaments",
      "Durable and performance-tested for regular use",
      "Appropriate for different skill levels and match conditions",
    ],
  },
];

export default function EquipmentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Equipment Information"
        description="Quality equipment for training and competition — following nationally and internationally accepted standards."
      />
      <PageContent>
        <MediaImage
          src={siteImages.equipment.overview}
          alt="Racquetball equipment specification diagram"
          aspect="square"
          fit="contain"
          containerClassName="mb-12 max-w-2xl mx-auto bg-white ring-1 ring-slate-200"
          sizes="(max-width: 768px) 100vw, 512px"
        />

        <EquipmentSection items={equipment} />
      </PageContent>
    </>
  );
}
