import "dotenv/config";
import prisma from "../src/infrastructure/database/prisma";
import {
  createRegistrationCategory,
  createTournament,
  removeOrDisableRegistrationCategory,
  updateRegistrationCategory,
  updateTournament,
  validateTournamentDates,
} from "../src/modules/tournaments/tournament.service";
import { assertTournamentDistrictAccess } from "../src/security/rbac/district-scope";
import { AppError } from "../src/core/errors/app-error";
import type { SessionUser } from "../src/security/rbac/permissions";

const SLUG_PREFIX = "phase-h-verify";

function expectThrow(fn: () => void, label: string) {
  try {
    fn();
    throw new Error(`Expected failure: ${label}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Expected failure")) throw error;
    console.log(`OK reject: ${label} -> ${(error as Error).message}`);
  }
}

async function main() {
  const before = await prisma.tournament.findMany({ select: { id: true, name: true, slug: true } });
  console.log(`Existing tournaments before: ${before.length}`);
  before.forEach((t) => console.log(`  keep: ${t.slug}`));

  const district = await prisma.district.findFirst({ orderBy: { name: "asc" } });
  const otherDistrict = await prisma.district.findFirst({
    where: district ? { id: { not: district.id } } : undefined,
    orderBy: { name: "asc" },
  });

  const base = {
    category: "OPEN" as const,
    districtId: district?.id,
    venue: "SMS Stadium",
    city: "Jaipur",
    startDate: "2026-12-10T09:00",
    endDate: "2026-12-12T18:00",
    registrationStart: "2026-11-01T09:00",
    registrationDeadline: "2026-12-01T18:00",
    banner: "https://drive.google.com/file/d/phase-h-poster/view",
    requiresApprovedPlayer: true,
    maxParticipants: 64,
  };

  const t1 = await createTournament({ ...base, name: "Phase H Verify Championship A" });
  const t2 = await createTournament({
    ...base,
    name: "Phase H Verify Championship B",
    startDate: "2027-03-10T09:00",
    endDate: "2027-03-12T18:00",
    registrationStart: "2027-02-01T09:00",
    registrationDeadline: "2027-03-01T18:00",
  });
  console.log("Created", t1.slug, t2.slug);

  const aSingles = await createRegistrationCategory(t1.id, { name: "Singles", type: "SINGLES", fee: 500 });
  const aDoubles = await createRegistrationCategory(t1.id, { name: "Doubles", type: "DOUBLES", fee: 800 });
  const bSingles = await createRegistrationCategory(t2.id, { name: "Singles", type: "SINGLES", fee: 1000 });
  const bDoubles = await createRegistrationCategory(t2.id, { name: "Doubles", type: "DOUBLES", fee: 1500 });
  console.log("Categories A", aSingles.fee, aDoubles.fee, "B", bSingles.fee, bDoubles.fee);

  await updateRegistrationCategory(aSingles.id, { fee: 600 });
  const aAfter = await prisma.tournamentRegistrationCategory.findUnique({ where: { id: aSingles.id } });
  const bAfter = await prisma.tournamentRegistrationCategory.findUnique({ where: { id: bSingles.id } });
  if (aAfter?.fee !== 600 || bAfter?.fee !== 1000) {
    throw new Error(`Fee isolation failed: A=${aAfter?.fee} B=${bAfter?.fee}`);
  }
  console.log("Fee edit isolated: A singles 600, B singles still 1000");

  const player = await prisma.player.findFirst({ select: { id: true } });
  if (!player) {
    console.log("HISTORICAL: no player row, registration insert skipped. Schema amount column checked below.");
  } else {
    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: t1.id,
        playerId: player.id,
        categoryId: aSingles.id,
        amount: 500,
        status: "PENDING",
      },
    });
    await updateRegistrationCategory(aSingles.id, { fee: 700 });
    const stored = await prisma.tournamentRegistration.findUnique({ where: { id: registration.id } });
    if (stored?.amount !== 500) throw new Error(`Historical amount changed to ${stored?.amount}`);
    const currentFee = await prisma.tournamentRegistrationCategory.findUnique({ where: { id: aSingles.id } });
    if (currentFee?.fee !== 700) throw new Error("Fee did not update for future registrations");
    console.log("HISTORICAL: registration amount stayed 500 after fee moved to 700");

    let typeBlocked = false;
    try {
      await updateRegistrationCategory(aSingles.id, { type: "DOUBLES" });
    } catch (error) {
      typeBlocked = error instanceof AppError;
      console.log("Type change blocked:", (error as Error).message);
    }
    if (!typeBlocked) throw new Error("Type change should have been rejected");

    const removed = await removeOrDisableRegistrationCategory(aSingles.id);
    if (removed.deleted || !removed.disabled) throw new Error("Used category should be disabled, not deleted");
    console.log("Used category disabled instead of deleted");

    await prisma.tournamentRegistration.delete({ where: { id: registration.id } });
    await updateRegistrationCategory(aSingles.id, { fee: 600, isActive: true });
  }

  expectThrow(
    () =>
      validateTournamentDates({
        startDate: "2026-12-10T09:00",
        endDate: "2026-12-12T18:00",
        registrationStart: "2026-12-05T09:00",
        registrationDeadline: "2026-12-01T18:00",
      }),
    "registration start after registration end"
  );
  expectThrow(
    () =>
      validateTournamentDates({
        startDate: "2026-12-10T09:00",
        endDate: "2026-12-12T18:00",
        registrationDeadline: "2026-12-10T09:00",
      }),
    "registration end equal to tournament start"
  );
  expectThrow(
    () =>
      validateTournamentDates({
        startDate: "2026-12-12T18:00",
        endDate: "2026-12-10T09:00",
      }),
    "tournament end before start"
  );
  validateTournamentDates({
    startDate: "2026-12-10T09:00",
    endDate: "2026-12-12T18:00",
    registrationStart: "2026-11-01T09:00",
    registrationDeadline: "2026-12-01T18:00",
  });
  console.log("Valid window accepted");

  const poster = await updateTournament(t1.id, { banner: "https://drive.google.com/file/d/phase-h-poster/view" });
  if (!poster.banner?.startsWith("https://")) throw new Error("Poster URL not stored");
  console.log("Poster stored", poster.banner);

  const draftHidden = t1.status === "DRAFT";
  console.log("Default status", t1.status, draftHidden ? "(hidden from public)" : "(UNEXPECTED)");

  const publicUser: SessionUser = {
    id: "public",
    email: "p@example.com",
    name: "Public",
    role: "public-user",
    permissions: [],
  };
  const districtAdmin: SessionUser = {
    id: "district",
    email: "d@example.com",
    name: "District",
    role: "district-admin",
    permissions: ["tournaments:manage", "tournaments:read"],
    districtId: district?.id,
  };
  let blocked = false;
  try {
    assertTournamentDistrictAccess(districtAdmin, otherDistrict && otherDistrict.id !== district?.id ? otherDistrict.id : "someone-else");
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("District admin should not manage another district");
  let stateBlocked = false;
  try {
    assertTournamentDistrictAccess(districtAdmin, null);
  } catch {
    stateBlocked = true;
  }
  if (!stateBlocked) throw new Error("District admin should not manage state-wide tournaments");
  assertTournamentDistrictAccess(
    { ...districtAdmin, role: "super-admin" },
    null
  );
  console.log("District scope holds. Public user permissions:", publicUser.permissions.join(",") || "(none)");

  const roles = await prisma.role.findMany({
    where: { slug: { in: ["super-admin", "district-admin", "public-user"] } },
    include: { permissions: { include: { permission: true } } },
  });
  for (const role of roles) {
    const slugs = role.permissions.map((row) => row.permission.slug);
    console.log(`Role ${role.slug}: tournaments:manage=${slugs.includes("tournaments:manage")} tournaments:read=${slugs.includes("tournaments:read")}`);
  }

  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tournament_registrations' AND column_name IN ('amount', 'categoryId')
  `;
  console.log("Registration snapshot columns:", columns.map((c) => c.column_name).join(", "));

  const relations = await prisma.tournament.findUnique({
    where: { id: t1.id },
    include: { registrationCategories: true, _count: { select: { registrations: true } } },
  });
  console.log(
    "DB relation A categories:",
    relations?.registrationCategories.map((c) => `${c.name}/${c.type}=${c.fee}`).join(", "),
    "registrations",
    relations?._count.registrations
  );

  await prisma.tournamentRegistrationCategory.deleteMany({ where: { tournamentId: { in: [t1.id, t2.id] } } });
  await prisma.tournament.deleteMany({ where: { id: { in: [t1.id, t2.id] } } });
  const after = await prisma.tournament.count();
  if (after !== before.length) throw new Error(`Tournament count changed ${before.length} -> ${after}`);
  console.log(`Cleanup ok. Tournament count still ${after}. Slug prefix ${SLUG_PREFIX} not left behind.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
