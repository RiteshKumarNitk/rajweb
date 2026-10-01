import type { Metadata } from "next";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { getPublicEquipment } from "@/modules/equipment/catalog";
import { EquipmentCatalog } from "./equipment-catalog";

export const metadata: Metadata = {
  title: "Equipment Shop",
  description:
    "Official racquetball equipment and accessories from the Rajasthan Racquetball Association — racquets, balls, grips, bags, and training gear.",
};

export const revalidate = 60;

export default async function EquipmentPage() {
  let items: Awaited<ReturnType<typeof getPublicEquipment>> = [];
  try {
    items = await getPublicEquipment();
  } catch {
    items = [];
  }

  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Equipment & Accessories"
        description="Official RRA equipment available to everyone. Signed-in members also see — and can order — their own district association’s equipment in their account."
      />
      <PageContent>
        {items.length === 0 ? (
          <p className="py-16 text-center text-slate-500">
            The equipment catalog is being prepared. Please check back soon.
          </p>
        ) : (
          <EquipmentCatalog items={items} />
        )}
      </PageContent>
    </>
  );
}
