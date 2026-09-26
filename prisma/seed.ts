import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from "../src/security/rbac/permissions";
import { rajasthanDistricts } from "../src/shared/config/site";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

  // Permissions
  const permissionEntries = Object.entries(PERMISSIONS).map(([key, slug]) => {
    const [module, action] = slug.split(":");
    return { key, slug, module, action };
  });

  for (const perm of permissionEntries) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: {
        name: perm.key.replace(/_/g, " "),
        slug: perm.slug,
        module: perm.module,
        action: perm.action,
      },
    });
  }

  // Role-Permission mappings
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role.slug as keyof typeof ROLE_PERMISSIONS] ?? [];
    for (const permSlug of perms) {
      const permission = await prisma.permission.findUnique({ where: { slug: permSlug } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }

  // Districts
  for (const name of rajasthanDistricts) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.district.upsert({
      where: { slug },
      update: {},
      create: { name, slug, isActive: true },
    });
  }

  // Super Admin user
  const superAdminRole = await prisma.role.findUnique({ where: { slug: ROLES.SUPER_ADMIN } });
  if (superAdminRole) {
    const passwordHash = await hash("Admin@123", 12);
    await prisma.user.upsert({
      where: { email: "admin@rajasthanracquetball.com" },
      update: {},
      create: {
        email: "admin@rajasthanracquetball.com",
        passwordHash,
        name: "Super Admin",
        roleId: superAdminRole.id,
        isActive: true,
        authProvider: "CREDENTIALS",
      },
    });
  }

  // District Admin user (Jaipur)
  const districtAdminRole = await prisma.role.findUnique({ where: { slug: ROLES.DISTRICT_ADMIN } });
  const jaipurDistrict = await prisma.district.findFirst({ where: { slug: "jaipur" } });
  if (districtAdminRole && jaipurDistrict) {
    const passwordHash = await hash("District@123", 12);
    await prisma.user.upsert({
      where: { email: "district.jaipur@rajasthanracquetball.com" },
      update: { districtId: jaipurDistrict.id },
      create: {
        email: "district.jaipur@rajasthanracquetball.com",
        passwordHash,
        name: "Jaipur District Admin",
        roleId: districtAdminRole.id,
        districtId: jaipurDistrict.id,
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
      isPublished: true,
      publishedAt: new Date("2025-02-15"),
    },
  ];

  for (const news of newsItems) {
    await prisma.news.upsert({
      where: { slug: news.slug },
      update: {},
      create: news,
    });
  }

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

  for (const video of videos) {
    await prisma.video.upsert({
      where: { slug: video.slug },
      update: {},
      create: video,
    });
  }

  // Gallery items — migrates the static siteImages.gallery list into the DB so
  // admins can manage it (title/category/image/order preserved exactly; driveUrl
  // left null — no Drive URLs are invented). Public page order = sortOrder asc,
  // matching the static array order. Idempotent on slug.
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

  for (const [index, item] of staticGalleryItems.entries()) {
    const slug = `gallery-${item.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
    await prisma.gallery.upsert({
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
  }

  // Equipment catalog demo item — admins add the real inventory via
  // /admin/equipment; this placeholder keeps the public shop non-empty on
  // fresh installs. Idempotent on slug.
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
    // Membership pricing — new vs renewal, per approved amounts. Read by
    // src/modules/account/membership-pricing.ts, not hardcoded in components.
    { key: "membership_fee_club_new", value: "51000", type: "number", group: "membership" },
    { key: "membership_fee_club_renewal", value: "21000", type: "number", group: "membership" },
    { key: "membership_fee_school_new", value: "31000", type: "number", group: "membership" },
    { key: "membership_fee_school_renewal", value: "11000", type: "number", group: "membership" },
    { key: "membership_fee_academy_new", value: "21000", type: "number", group: "membership" },
    { key: "membership_fee_academy_renewal", value: "5100", type: "number", group: "membership" },
  ];

  // Superseded by the new_/renewal_ split above — remove the old single-value keys.
  await prisma.setting.deleteMany({
    where: { key: { in: ["membership_fee_club", "membership_fee_school", "membership_fee_academy"] } },
  });

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  // ─── Sample QA / demo records (fixed IDs for testing) ─────────
  const jodhpurDistrict = await prisma.district.findFirst({ where: { slug: "jodhpur" } });
  const udaipurDistrict = await prisma.district.findFirst({ where: { slug: "udaipur" } });

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

  console.log("Seed completed successfully!");
  console.log("Admin login: admin@rajasthanracquetball.com / Admin@123");
  console.log("District admin: district.jaipur@rajasthanracquetball.com / District@123");
  console.log("Verify player cert: RRA-2025-PLR001  |  QR: QR-RRA-2025-PLR001");
  console.log("Verify coach cert:  RRA-2025-CCH001  |  QR: QR-RRA-2025-CCH001");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
