import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from "../src/security/rbac/permissions";
import { rajasthanDistricts } from "../src/shared/config/site";
import { OFFICIAL_SIGNATORIES } from "../src/modules/verify/verify.types";
import { seedCertificateTemplates } from "./seed-certificates";

// Seed DATA for the association's founding state. Application logic never
// refers to a specific state — further states are added via /admin/states.
const FOUNDING_STATE = { name: "Rajasthan", slug: "rajasthan", code: "RJ" };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Seeded accounts carry well-known demo passwords, so a missing account is only
// CREATED on a local database (or with SEED_DEMO_ACCOUNTS=true for a disposable
// copy). Elsewhere existing accounts are still updated as before — never their
// password — but no demo-password account is ever created.
const DB_HOST = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();
const CREATE_DEMO_ACCOUNTS =
  ["localhost", "127.0.0.1", "[::1]"].includes(DB_HOST) || process.env.SEED_DEMO_ACCOUNTS === "true";

async function seedAccount(args: {
  where: { email: string };
  update: Prisma.UserUncheckedUpdateInput;
  create: Prisma.UserUncheckedCreateInput;
}) {
  if (CREATE_DEMO_ACCOUNTS) return prisma.user.upsert(args);
  const { count } = await prisma.user.updateMany({
    where: args.where,
    data: args.update as Prisma.UserUncheckedUpdateManyInput,
  });
  if (count === 0) console.log(`   Skipped creating demo account ${args.where.email} (non-local database)`);
}

async function main() {
  console.log("Seeding database...");

  // Roles
  const roles = await Promise.all(
    Object.entries(ROLES).map(([key, slug]) =>
      prisma.role.upsert({
        where: { slug },
        update: {},
        create: {
          name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          slug,
          description: `${key.replace(/_/g, " ")} role`,
          isSystem: true,
        },
      })
    )
  );

  // Permissions (parallelized)
  const permissionEntries = Object.entries(PERMISSIONS).map(([key, slug]) => {
    const [module, action] = slug.split(":");
    return { key, slug, module, action };
  });

  await Promise.all(
    permissionEntries.map((perm) =>
      prisma.permission.upsert({
        where: { slug: perm.slug },
        update: {},
        create: {
          name: perm.key.replace(/_/g, " "),
          slug: perm.slug,
          module: perm.module,
          action: perm.action,
        },
      })
    )
  );

  // Pre-load all permissions to avoid repetitive findUnique queries
  const allPermissions = await prisma.permission.findMany({ select: { id: true, slug: true } });
  const permMap = new Map(allPermissions.map((p) => [p.slug, p.id]));

  // Role-Permission mappings (parallelized)
  const rolePermPromises: Promise<unknown>[] = [];
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role.slug as keyof typeof ROLE_PERMISSIONS] ?? [];
    for (const permSlug of perms) {
      const permissionId = permMap.get(permSlug);
      if (permissionId) {
        rolePermPromises.push(
          prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId } },
            update: {},
            create: { roleId: role.id, permissionId },
          })
        );
      }
    }
  }
  await Promise.all(rolePermPromises);

  // States & districts
  const foundingState = await prisma.state.upsert({
    where: { slug: FOUNDING_STATE.slug },
    update: {},
    create: { ...FOUNDING_STATE, isActive: true, sortOrder: 0 },
  });

  // Backfill (idempotent): districts created before states existed all came
  // from this same list, so they belong to the founding state.
  const backfilledDistricts = await prisma.district.updateMany({
    where: { stateId: null, name: { in: [...rajasthanDistricts] } },
    data: { stateId: foundingState.id },
  });
  if (backfilledDistricts.count > 0) {
    console.log(`Backfilled ${backfilledDistricts.count} districts -> ${foundingState.name}`);
  }

  // Certificate signatories (idempotent):
  const existingStateSigners = await prisma.certificateSignatory.count({
    where: { stateId: foundingState.id, districtId: null },
  });
  if (existingStateSigners === 0) {
    const officials = [OFFICIAL_SIGNATORIES.president, OFFICIAL_SIGNATORIES.generalSecretary];
    for (const [index, official] of officials.entries()) {
      await prisma.certificateSignatory.create({
        data: {
          name: official.name,
          designation: official.title,
          organization: official.organization,
          stateId: foundingState.id,
          districtId: null,
          sortOrder: index,
          isActive: true,
        },
      });
    }
    console.log(`Created ${officials.length} state-level certificate signatories for ${foundingState.name}`);
  }

  // Certificate image library + default template (same code as `npm run db:seed:certificates`).
  await seedCertificateTemplates(prisma);

  await Promise.all(
    rajasthanDistricts.map((name, index) => {
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      return prisma.district.upsert({
        where: { stateId_slug: { stateId: foundingState.id, slug } },
        update: {},
        create: { name, slug, stateId: foundingState.id, sortOrder: index, isActive: true },
      });
    })
  );

  const jaipurDistrict = await prisma.district.findFirst({ where: { stateId: foundingState.id, slug: "jaipur" } });
  const kotaDistrict = await prisma.district.findFirst({ where: { stateId: foundingState.id, slug: "kota" } });
  const jodhpurDistrict = await prisma.district.findFirst({ where: { stateId: foundingState.id, slug: "jodhpur" } });
  const udaipurDistrict = await prisma.district.findFirst({ where: { stateId: foundingState.id, slug: "udaipur" } });

  // Pre-fetch roles
  const superAdminRole = await prisma.role.findUnique({ where: { slug: ROLES.SUPER_ADMIN } });
  const stateAdminRole = await prisma.role.findUnique({ where: { slug: ROLES.STATE_ADMIN } });
  const districtAdminRole = await prisma.role.findUnique({ where: { slug: ROLES.DISTRICT_ADMIN } });
  const tournamentManagerRole = await prisma.role.findUnique({ where: { slug: ROLES.TOURNAMENT_MANAGER } });
  const contentManagerRole = await prisma.role.findUnique({ where: { slug: ROLES.CONTENT_MANAGER } });
  const publicUserRole = await prisma.role.findUnique({ where: { slug: ROLES.PUBLIC_USER } });

  // 1. Super Admin user (Federation-Wide / GLOBAL)
  if (superAdminRole) {
    const passwordHash = await hash("Admin@123", 10);
    await seedAccount({
      where: { email: "admin@rajasthanracquetball.com" },
      update: { roleId: superAdminRole.id, isFederationWide: true },
      create: {
        email: "admin@rajasthanracquetball.com",
        passwordHash,
        name: "Super Admin",
        roleId: superAdminRole.id,
        isFederationWide: true,
        isActive: true,
        authProvider: "CREDENTIALS",
      },
    });
  }

  // 2. Rajasthan State Admin (STATE Scope)
  if (stateAdminRole) {
    const stateAdminHash = await hash("State@123", 10);
    await seedAccount({
      where: { email: "state.rajasthan@rajasthanracquetball.com" },
      update: { stateId: foundingState.id, districtId: null, roleId: stateAdminRole.id },
      create: {
        email: "state.rajasthan@rajasthanracquetball.com",
        passwordHash: stateAdminHash,
        name: "Rajasthan State Admin",
        roleId: stateAdminRole.id,
        stateId: foundingState.id,
        districtId: null,
        isActive: true,
        authProvider: "CREDENTIALS",
      },
    });
  }

  // 3. District Admins (DISTRICT Scope: Jaipur & Kota)
  if (districtAdminRole) {
    const districtAdminHash = await hash("District@123", 10);

    // Jaipur District Admin
    if (jaipurDistrict) {
      await seedAccount({
        where: { email: "district.jaipur@rajasthanracquetball.com" },
        update: { stateId: foundingState.id, districtId: jaipurDistrict.id, roleId: districtAdminRole.id },
        create: {
          email: "district.jaipur@rajasthanracquetball.com",
          passwordHash: districtAdminHash,
          name: "Jaipur District Admin",
          roleId: districtAdminRole.id,
          stateId: foundingState.id,
          districtId: jaipurDistrict.id,
          isActive: true,
          authProvider: "CREDENTIALS",
        },
      });
    }

    // Kota District Admin
    if (kotaDistrict) {
      await seedAccount({
        where: { email: "district.kota@rajasthanracquetball.com" },
        update: { stateId: foundingState.id, districtId: kotaDistrict.id, roleId: districtAdminRole.id },
        create: {
          email: "district.kota@rajasthanracquetball.com",
          passwordHash: districtAdminHash,
          name: "Kota District Admin",
          roleId: districtAdminRole.id,
          stateId: foundingState.id,
          districtId: kotaDistrict.id,
          isActive: true,
          authProvider: "CREDENTIALS",
        },
      });
    }
  }

  // 4. Managers & Public User for Testing
  if (tournamentManagerRole) {
    const tourMgrHash = await hash("Tournament@123", 10);
    await seedAccount({
      where: { email: "tournaments@rajasthanracquetball.com" },
      update: { roleId: tournamentManagerRole.id },
      create: {
        email: "tournaments@rajasthanracquetball.com",
        passwordHash: tourMgrHash,
        name: "Tournament Manager",
        roleId: tournamentManagerRole.id,
        isFederationWide: true,
        isActive: true,
        authProvider: "CREDENTIALS",
      },
    });
  }

  if (contentManagerRole) {
    const contentMgrHash = await hash("Content@123", 10);
    await seedAccount({
      where: { email: "content@rajasthanracquetball.com" },
      update: { roleId: contentManagerRole.id },
      create: {
        email: "content@rajasthanracquetball.com",
        passwordHash: contentMgrHash,
        name: "Content Manager",
        roleId: contentManagerRole.id,
        isFederationWide: true,
        isActive: true,
        authProvider: "CREDENTIALS",
      },
    });
  }

  if (publicUserRole) {
    const playerUserHash = await hash("Player@123", 10);
    await seedAccount({
      where: { email: "player.test@example.com" },
      update: { roleId: publicUserRole.id },
      create: {
        email: "player.test@example.com",
        passwordHash: playerUserHash,
        name: "Rahul Sharma (Player)",
        roleId: publicUserRole.id,
        isActive: true,
        authProvider: "CREDENTIALS",
      },
    });
  }


  // Executive Committee
  const executives = [
    { name: "President", designation: "President", order: 1 },
    { name: "Vice President", designation: "Vice President", order: 2 },
    { name: "Secretary General", designation: "Secretary General", order: 3 },
    { name: "Treasurer", designation: "Treasurer", order: 4 },
    { name: "Technical Director", designation: "Technical Director", order: 5 },
  ];

  for (const exec of executives) {
    const existing = await prisma.executiveMember.findFirst({
      where: { designation: exec.designation },
    });
    if (!existing) {
      await prisma.executiveMember.create({ data: exec });
    }
  }

  // Partners
  const partners = [
    { name: "Let's Win Together", type: "title-sponsor", order: 1 },
    { name: "Indian Racquetball Association", type: "partner", order: 2 },
    { name: "International Racquetball Federation", type: "partner", order: 3 },
  ];

  for (const partner of partners) {
    const existing = await prisma.partner.findFirst({ where: { name: partner.name } });
    if (!existing) {
      await prisma.partner.create({ data: partner });
    }
  }

  // Sample News
  const newsItems = [
    {
      title: "RRA Formed and Affiliated with IRA",
      slug: "rra-formed-affiliated-ira",
      excerpt: "Rajasthan Racquetball Association receives official affiliation from Indian Racquetball Association.",
      content: "The Rajasthan Racquetball Association (RRA) was formed in 2025 and received official affiliation from the Indian Racquetball Association (IRA) in the same year, marking a significant milestone for racquetball in Rajasthan.",
      category: "Announcement",
      tags: ["RRA", "Affiliation", "IRA"],
      isPublished: true,
      publishedAt: new Date("2025-01-15"),
    },
    {
      title: "State Championship 2025 Announced",
      slug: "state-championship-2025",
      excerpt: "RRA announces the inaugural Rajasthan State Racquetball Championship.",
      content: "The Rajasthan Racquetball Association is proud to announce the inaugural State Racquetball Championship 2025, to be held across multiple categories including Junior, Senior, Open, and Professional.",
      category: "Tournament",
      tags: ["Championship", "Tournament"],
      isPublished: true,
      publishedAt: new Date("2025-02-01"),
    },
    {
      title: "Player Registration Portal Now Open",
      slug: "player-registration-open",
      excerpt: "Register as an official RRA player through our online portal.",
      content: "The RRA player registration portal is now live. All aspiring racquetball players across Rajasthan can register online and receive official RRA player certification upon approval.",
      category: "Registration",
      tags: ["Players", "Registration"],
      isPublished: true,
      publishedAt: new Date("2025-02-15"),
    },
  ];

  await Promise.all(
    newsItems.map((news) =>
      prisma.news.upsert({
        where: { slug: news.slug },
        update: {},
        create: news,
      })
    )
  );

  // Sample Tournaments
  if (jaipurDistrict) {
    await prisma.tournament.upsert({
      where: { slug: "rajasthan-state-championship-2025" },
      update: {},
      create: {
        name: "Rajasthan State Championship 2025",
        slug: "rajasthan-state-championship-2025",
        description: "The inaugural state-level racquetball championship featuring all categories.",
        category: "OPEN",
        status: "REGISTRATION_OPEN",
        districtId: jaipurDistrict.id,
        venue: "Jaipur Sports Complex",
        startDate: new Date("2025-08-15"),
        endDate: new Date("2025-08-18"),
        registrationDeadline: new Date("2025-08-01"),
        maxParticipants: 128,
      },
    });

    await prisma.tournament.upsert({
      where: { slug: "jaipur-district-open-2025" },
      update: {},
      create: {
        name: "Jaipur District Open 2025",
        slug: "jaipur-district-open-2025",
        description: "District-level open category tournament in Jaipur.",
        category: "OPEN",
        status: "REGISTRATION_OPEN",
        districtId: jaipurDistrict.id,
        venue: "Jaipur Racquetball Club",
        startDate: new Date("2025-06-20"),
        endDate: new Date("2025-06-22"),
        registrationDeadline: new Date("2025-06-10"),
        maxParticipants: 64,
      },
    });
  }

  // Sample Videos
  const videos = [
    {
      title: "Introduction to Racquetball",
      slug: "introduction-to-racquetball",
      description: "Learn the basics of racquetball - rules, equipment, and gameplay.",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      category: "Training",
      tags: ["Basics", "Training"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      title: "RRA State Championship Highlights",
      slug: "rra-championship-highlights",
      description: "Highlights from the Rajasthan State Racquetball Championship.",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      category: "Highlights",
      tags: ["Championship", "Highlights"],
      isPublished: true,
      publishedAt: new Date(),
    },
  ];

  await Promise.all(
    videos.map((video) =>
      prisma.video.upsert({
        where: { slug: video.slug },
        update: {},
        create: video,
      })
    )
  );

  // Gallery items — migrates the static siteImages.gallery list into the DB
  const staticGalleryItems = [
    { title: "State Championship Poster", src: "/images/rra/poster-state-championship-2026.jpg", category: "Tournament" },
    { title: "National Championship Award", src: "/images/rra/award-national-championship.jpg", category: "Events" },
    { title: "Live Match Action", src: "/images/rra/action-court-01.jpg", category: "Action" },
    { title: "Tournament Rally", src: "/images/rra/action-court-02.jpg", category: "Action" },
    { title: "Inter-State Competition", src: "/images/rra/action-court-03.jpg", category: "Action" },
    { title: "Championship Point", src: "/images/rra/action-court-04.jpg", category: "Action" },
    { title: "Training Camp on Court", src: "/images/rra/training-camp-court.jpg", category: "Training" },
    { title: "Glass Court Action", src: "/images/rra/action-court-05.jpg", category: "Action" },
    { title: "RRA Team Group Photo", src: "/images/rra/team-group-01.jpg", category: "Team" },
    { title: "State Team with Officials", src: "/images/rra/team-group-02.jpg", category: "Team" },
    { title: "Outdoor Court Play", src: "/images/rra/outdoor-court-action.jpg", category: "Facilities" },
    { title: "Outdoor Racquetball Facility", src: "/images/rra/outdoor-court-facility.jpg", category: "Facilities" },
    { title: "RRA Official Banner", src: "/images/RRA.jpeg", category: "Leadership" },
    { title: "RRA Affiliations", src: "/images/RRA.jpeg", category: "Leadership" },
  ];

  await Promise.all(
    staticGalleryItems.map((item, index) => {
      const slug = `gallery-${item.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;
      return prisma.gallery.upsert({
        where: { slug },
        update: {},
        create: {
          title: item.title,
          slug,
          category: item.category,
          imageUrl: item.src,
          sortOrder: index,
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    })
  );

  // Equipment catalog demo item
  await prisma.equipmentItem.upsert({
    where: { slug: "demo-equipment-placeholder" },
    update: {},
    create: {
      name: "Demo Equipment Placeholder",
      slug: "demo-equipment-placeholder",
      category: "OTHER",
      shortDescription: "Sample listing — replace with real inventory in the admin panel.",
      description: "This placeholder is seeded so the public equipment page renders correctly on a fresh install. Delete or deactivate it once real products exist.",
      price: 1000,
      stockQuantity: 10,
      isActive: true,
      sortOrder: 0,
    },
  });

  // Settings
  const settings = [
    { key: "site_name", value: "Rajasthan Racquetball Association", group: "general" },
    { key: "contact_email", value: "rajasthanracquetball@gmail.com", group: "contact" },
    { key: "contact_phone", value: "+91 99289 62982", group: "contact" },
    { key: "membership_fee_club_new", value: "51000", type: "number", group: "membership" },
    { key: "membership_fee_club_renewal", value: "21000", type: "number", group: "membership" },
    { key: "membership_fee_school_new", value: "31000", type: "number", group: "membership" },
    { key: "membership_fee_school_renewal", value: "11000", type: "number", group: "membership" },
    { key: "membership_fee_academy_new", value: "21000", type: "number", group: "membership" },
    { key: "membership_fee_academy_renewal", value: "5100", type: "number", group: "membership" },
  ];

  await prisma.setting.deleteMany({
    where: { key: { in: ["membership_fee_club", "membership_fee_school", "membership_fee_academy"] } },
  });

  await Promise.all(
    settings.map((setting) =>
      prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      })
    )
  );

  // ─── Sample QA / demo records (fixed IDs for testing) ─────────
  if (jaipurDistrict) {
    const approvedPlayer = await prisma.player.upsert({
      where: { playerId: "PLR-TEST-001" },
      update: { status: "APPROVED", approvedAt: new Date() },
      create: {
        playerId: "PLR-TEST-001",
        name: "Rahul Sharma",
        dateOfBirth: new Date("2008-05-15"),
        gender: "MALE",
        email: "rahul.test@example.com",
        mobile: "9876543210",
        districtId: jaipurDistrict.id,
        status: "APPROVED",
        approvedAt: new Date("2025-03-01"),
      },
    });

    await prisma.playerCertificate.upsert({
      where: { certificateNumber: "RRA-2025-PLR001" },
      update: {},
      create: {
        certificateNumber: "RRA-2025-PLR001",
        playerId: approvedPlayer.id,
        qrCode: "QR-RRA-2025-PLR001",
        issuedAt: new Date("2025-03-01"),
        expiresAt: new Date("2026-03-01"),
      },
    });

    const approvedCoach = await prisma.coach.upsert({
      where: { coachId: "CCH-TEST-001" },
      update: { status: "APPROVED", approvedAt: new Date() },
      create: {
        coachId: "CCH-TEST-001",
        name: "Priya Mehta",
        email: "priya.coach@example.com",
        mobile: "9876543211",
        qualification: "Level 2 Certified Coach, 8 years experience",
        certificationLevel: "LEVEL_2",
        districtId: jaipurDistrict.id,
        status: "APPROVED",
        approvedAt: new Date("2025-02-15"),
      },
    });

    await prisma.coachCertificate.upsert({
      where: { certificateNumber: "RRA-2025-CCH001" },
      update: {},
      create: {
        certificateNumber: "RRA-2025-CCH001",
        coachId: approvedCoach.id,
        qrCode: "QR-RRA-2025-CCH001",
        issuedAt: new Date("2025-02-15"),
        expiresAt: new Date("2027-02-15"),
      },
    });

    await prisma.clubMembership.upsert({
      where: { membershipId: "CLB-TEST-001" },
      update: {},
      create: {
        membershipId: "CLB-TEST-001",
        clubName: "Jaipur Racquetball Club",
        contactPerson: "Amit Jain",
        email: "club.jaipur@example.com",
        mobile: "9876543212",
        address: "Malviya Nagar, Jaipur, Rajasthan 302017",
        districtId: jaipurDistrict.id,
        numberOfCourts: 2,
        status: "PENDING",
      },
    });
  }

  if (jodhpurDistrict) {
    await prisma.player.upsert({
      where: { playerId: "PLR-TEST-002" },
      update: {},
      create: {
        playerId: "PLR-TEST-002",
        name: "Vikram Singh",
        dateOfBirth: new Date("2010-08-20"),
        gender: "MALE",
        email: "vikram.test@example.com",
        mobile: "9876543213",
        districtId: jodhpurDistrict.id,
        status: "PENDING",
      },
    });
  }

  if (udaipurDistrict) {
    await prisma.coach.upsert({
      where: { coachId: "CCH-TEST-002" },
      update: {},
      create: {
        coachId: "CCH-TEST-002",
        name: "Sanjay Patel",
        email: "sanjay.coach@example.com",
        mobile: "9876543214",
        qualification: "Level 1 Coach Certification",
        certificationLevel: "LEVEL_1",
        districtId: udaipurDistrict.id,
        status: "PENDING",
      },
    });
  }

  // Backfill tournament ownership (idempotent, only rows with no state):
  //  - district tournaments take their district's state (exact);
  //  - state-wide tournaments (no district) predate multi-state support and
  //    can only belong to the single state that existed then — assigned only
  //    while exactly one state exists, otherwise left for the Super Admin.
  const unownedTournaments = await prisma.tournament.findMany({
    where: { stateId: null },
    select: { id: true, district: { select: { stateId: true } } },
  });
  const stateCount = await prisma.state.count();
  let backfilledTournaments = 0;
  for (const t of unownedTournaments) {
    const stateId = t.district ? t.district.stateId : stateCount === 1 ? foundingState.id : null;
    if (!stateId) continue;
    await prisma.tournament.update({ where: { id: t.id }, data: { stateId } });
    backfilledTournaments += 1;
  }
  if (backfilledTournaments > 0) console.log(`Backfilled state on ${backfilledTournaments} tournaments`);

  console.log("\n========================================================");
  console.log("             SEED COMPLETED SUCCESSFULLY!                ");
  console.log("========================================================");
  console.log("\n--- SUPER ADMIN (GLOBAL / FEDERATION) ---");
  console.log("Email:    admin@rajasthanracquetball.com");
  console.log("Password: Admin@123");
  console.log("Role:     super-admin (Full System Access)");

  console.log("\n--- STATE ADMIN ACCOUNT (STATE SCOPE) ---");
  console.log("State (Rajasthan): state.rajasthan@rajasthanracquetball.com / State@123");

  console.log("\n--- DISTRICT ADMIN ACCOUNTS (DISTRICT SCOPE) ---");
  console.log("1. Jaipur District: district.jaipur@rajasthanracquetball.com / District@123");
  console.log("2. Kota District:   district.kota@rajasthanracquetball.com   / District@123");

  console.log("\n--- MODULE MANAGERS & TEST USER ---");
  console.log("Tournament Manager: tournaments@rajasthanracquetball.com     / Tournament@123");
  console.log("Content Manager:    content@rajasthanracquetball.com        / Content@123");
  console.log("Test Player User:   player.test@example.com                 / Player@123");

  console.log("\n--- CERTIFICATE VERIFICATION DEMO ---");
  console.log("Player Cert: RRA-2025-PLR001  |  QR: QR-RRA-2025-PLR001");
  console.log("Coach Cert:  RRA-2025-CCH001  |  QR: QR-RRA-2025-CCH001");
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
