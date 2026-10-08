/**
 * Certificate-template bootstrap — safe for production.
 *
 *   npm run db:seed:certificates
 *
 * Installs ONLY what the certificate template system needs: the bundled
 * certificate images (certificate_assets → files under public/images/certificates/,
 * which ship with the app) and the default "RRA Standard Tournament Certificate"
 * v1. Idempotent: existing images are reused by path, and nothing is created
 * when any template already exists (design changes are new versions made in
 * the admin, never by this script). It never reads or writes users, roles,
 * states, districts, players, coaches, tournaments, orders, signatories or
 * certificates. The full development seed (prisma/seed.ts) calls the same
 * function.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DEFAULT_TEMPLATE_CONFIG } from "../src/services/certificates/templates/template-config";

const CERTIFICATE_IMAGES = [
  { key: "rra", name: "Rajasthan Racquetball Association", category: "BRANDING", imagePath: "/images/certificates/rra-branding.png" },
  { key: "ira", name: "Indian Racquetball Association", category: "LOGO", imagePath: "/images/certificates/indian-racquetball-association.png" },
  { key: "irf", name: "International Racquetball Federation", category: "LOGO", imagePath: "/images/certificates/irf.png" },
  { key: "arf", name: "Asian Racquetball Federation", category: "LOGO", imagePath: "/images/certificates/arf.png" },
  { key: "ioc", name: "International Olympic Committee", category: "LOGO", imagePath: "/images/certificates/ioc.png" },
  { key: "twg", name: "The World Games", category: "LOGO", imagePath: "/images/certificates/the-world-games.png" },
  { key: "oca", name: "Olympic Council of Asia", category: "LOGO", imagePath: "/images/certificates/oca.png" },
  { key: "emblem", name: "Racquetball emblem", category: "EMBLEM", imagePath: "/images/certificates/racquetball-emblem.png" },
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

  if ((await prisma.certificateTemplate.count()) > 0) {
    console.log("Certificate templates already exist — left unchanged.");
    return;
  }
  await prisma.certificateTemplate.create({
    data: {
      familyId: "rra-standard-tournament",
      name: "RRA Standard Tournament Certificate",
      description: "A4 portrait tournament certificate — the association's reference design.",
      version: 1,
      layout: "rra-standard@1",
      isDefault: true,
      config: {
        ...DEFAULT_TEMPLATE_CONFIG,
        logos: { left: [assetIds.ira, assetIds.irf, assetIds.arf], center: assetIds.rra, right: [assetIds.ioc, assetIds.twg, assetIds.oca] },
        emblemAssetId: assetIds.emblem,
        watermark: { assetId: assetIds.rra, opacity: DEFAULT_TEMPLATE_CONFIG.watermark.opacity },
      },
    },
  });
  console.log("Certificate template created: RRA Standard Tournament Certificate v1 (default)");
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
