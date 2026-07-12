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

async function seedDepartments() {
  // Head office sits at the top; Engineering and Sales report into it.
  const headOffice = await prisma.department.create({
    data: { name: "Head Office" },
  });

  const [engineering, sales, facilities, it] = await Promise.all([
    prisma.department.create({
      data: { name: "Engineering", parentId: headOffice.id },
    }),
    prisma.department.create({
      data: { name: "Sales", parentId: headOffice.id },
    }),
    prisma.department.create({ data: { name: "Facilities" } }),
    prisma.department.create({ data: { name: "IT Support" } }),
  ]);

  return { headOffice, engineering, sales, facilities, it };
}

async function seedCategories() {
  const [electronics, furniture, vehicles, equipment] = await Promise.all([
    prisma.category.create({
      data: {
        name: "Electronics",
        customFields: { warrantyMonths: 24 },
      },
    }),
    prisma.category.create({ data: { name: "Furniture" } }),
    prisma.category.create({
      data: {
        name: "Vehicles",
        customFields: { registrationRequired: true },
      },
    }),
    prisma.category.create({ data: { name: "Equipment" } }),
  ]);

  return { electronics, furniture, vehicles, equipment };
}

async function main() {
  console.log("Wiping existing data...");
  await wipe();

  console.log("Seeding departments...");
  const departments = await seedDepartments();

  console.log("Seeding categories...");
  const categories = await seedCategories();

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
