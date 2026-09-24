import "dotenv/config";
import prisma from "../src/infrastructure/database/prisma";

async function main() {
  const t1 = await prisma.tournamentRegistrationCategory.findMany({ where: { tournamentId: "cmueddhwi0001lovizk3ccggi" } });
  const t2 = await prisma.tournamentRegistrationCategory.findMany({ where: { tournamentId: "cmueddoxw0003lovix521b4fm" } });
  console.log("Tournament 1 categories:", t1.map((c) => `${c.name}=${c.fee}`).join(", "));
  console.log("Tournament 2 categories (should be unaffected — Singles=1000, Doubles=1500):", t2.map((c) => `${c.name}=${c.fee}`).join(", "));
  await prisma.$disconnect();
}
main();
