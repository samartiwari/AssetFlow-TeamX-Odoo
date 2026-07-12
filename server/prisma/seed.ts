import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

// Wipe everything before reseeding so `npm run seed` always produces a clean,
// known demo state. Order matters: delete children before parents to respect
// foreign keys.
async function wipe() {
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditItem.deleteMany();
  await prisma.auditCycle.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.category.deleteMany();
}

function hash(password: string) {
  return bcrypt.hashSync(password, 10);
}

async function main() {
  console.log("Wiping existing data...");
  await wipe();

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
