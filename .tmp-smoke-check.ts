import "dotenv/config";
process.env.DATABASE_URL = process.env.TESTDB_URL;
import { prisma } from "./src/infrastructure/database/prisma";
async function main() {
  const c = await prisma.setting.count();
  console.log("settings rows:", c);
  await prisma.$transaction([prisma.role.count(), prisma.user.count()]);
  console.log("transaction OK");
}
main().catch((e) => { console.error("ERR:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
