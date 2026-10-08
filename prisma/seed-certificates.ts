/**
 * Certificate-template bootstrap — safe for production.
 *
 *   npm run db:seed:certificates
 *
 * Installs ONLY what the certificate template system needs: the bundled
 * certificate images (certificate_assets → files under public/images/certificates/,
 * which ship with the app) and the "RRA Standard Tournament Certificate" on
 * the A4 background design (layout rra-standard@2) as the default template.
 *
 * Idempotent:
 *  - images are reused by path;
 *  - no template family yet → creates it with the background design as v1;
 *  - family exists without a background-design version → adds the NEXT
 *    version (e.g. v2) with that design and makes it the default. Existing
 *    versions are never edited (only the default flag moves), so certificates
 *    issued with them keep their design. Tournaments that picked a version
 *    explicitly keep it; tournaments on "Default template" get the new design;
 *  - otherwise nothing changes.
 * It never reads or writes users, roles, states, districts, players, coaches,
 * tournaments, orders, signatories or certificates. The full development seed
 * (prisma/seed.ts) calls the same function.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DEFAULT_TEMPLATE_CONFIG, parseTemplateConfig } from "../src/services/certificates/templates/template-config";

const FAMILY_ID = "rra-standard-tournament";
const BACKGROUND_LAYOUT = "rra-standard@2";

const CERTIFICATE_IMAGES = [
  { key: "rra", name: "Rajasthan Racquetball Association", category: "BRANDING", imagePath: "/images/certificates/rra-branding.png" },
  { key: "ira", name: "Indian Racquetball Association", category: "LOGO", imagePath: "/images/certificates/indian-racquetball-association.png" },
  { key: "irf", name: "International Racquetball Federation", category: "LOGO", imagePath: "/images/certificates/irf.png" },
  { key: "arf", name: "Asian Racquetball Federation", category: "LOGO", imagePath: "/images/certificates/arf.png" },
  { key: "ioc", name: "International Olympic Committee", category: "LOGO", imagePath: "/images/certificates/ioc.png" },
  { key: "twg", name: "The World Games", category: "LOGO", imagePath: "/images/certificates/the-world-games.png" },
  { key: "oca", name: "Olympic Council of Asia", category: "LOGO", imagePath: "/images/certificates/oca.png" },
  { key: "emblem", name: "Racquetball emblem", category: "EMBLEM", imagePath: "/images/certificates/racquetball-emblem.png" },
  { key: "background", name: "RRA A4 certificate background", category: "BRANDING", imagePath: "/images/certificates/background-a4.jpg" },
] as const;

export async function seedCertificateTemplates(prisma: PrismaClient) {
  const assetIds: Record<string, string> = {};
  for (const img of CERTIFICATE_IMAGES) {
    const existing = await prisma.certificateAsset.findFirst({ where: { imagePath: img.imagePath } });
    if (existing) {
      assetIds[img.key] = existing.id;
    } else {
      assetIds[img.key] = (await prisma.certificateAsset.create({ data: { name: img.name, category: img.category, imagePath: img.imagePath } })).id;
      console.log(`Certificate image added: ${img.name}`);
    }
  }

  // The background carries the logos and the map watermark; the emblem is drawn on top.
  const backgroundDesign = (base: typeof DEFAULT_TEMPLATE_CONFIG) => ({
    ...base,
    frame: { ...base.frame, enabled: false },
    logos: { left: [], center: null, right: [] },
    watermark: { assetId: null, opacity: base.watermark.opacity },
    emblemAssetId: assetIds.emblem,
    backgroundAssetId: assetIds.background,
    optionDisplay: "SELECTED" as const,
  });

  const family = await prisma.certificateTemplate.findMany({ where: { familyId: FAMILY_ID }, orderBy: { version: "desc" } });
  if (family.length === 0) {
    if ((await prisma.certificateTemplate.count()) > 0) {
      console.log("Other certificate templates exist — RRA Standard not installed; add it from the admin if needed.");
      return;
    }
    await prisma.certificateTemplate.create({
      data: {
        familyId: FAMILY_ID,
        name: "RRA Standard Tournament Certificate",
        description: "A4 portrait tournament certificate on the association's background artwork.",
        version: 1,
        layout: BACKGROUND_LAYOUT,
        isDefault: true,
        config: backgroundDesign(DEFAULT_TEMPLATE_CONFIG),
      },
    });
    console.log("Certificate template created: RRA Standard Tournament Certificate v1 (background design, default)");
    return;
  }
  if (family.some((t) => t.layout === BACKGROUND_LAYOUT)) {
    console.log("RRA Standard background design already installed — left unchanged.");
    return;
  }
  const latest = family[0];
  // Wording, labels, colours and positions carry over from the latest version.
  const config = backgroundDesign(parseTemplateConfig(latest.config));
  await prisma.$transaction([
    prisma.certificateTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    prisma.certificateTemplate.create({
      data: {
        familyId: FAMILY_ID,
        name: latest.name,
        description: "A4 portrait tournament certificate on the association's background artwork.",
        version: latest.version + 1,
        layout: BACKGROUND_LAYOUT,
        isDefault: true,
        config,
      },
    }),
  ]);
  console.log(`Certificate template added: ${latest.name} v${latest.version + 1} (background design, now default); v${latest.version} unchanged`);
}

// Run directly (not when imported by prisma/seed.ts).
if (process.argv[1] && /seed-certificates\.ts$/.test(process.argv[1])) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  seedCertificateTemplates(prisma)
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
