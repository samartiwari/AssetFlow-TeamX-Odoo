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

type Departments = Awaited<ReturnType<typeof seedDepartments>>;

async function seedUsers(depts: Departments) {
  // Everyone shares a simple demo password except the admin, so the login flow
  // is easy to show during judging.
  const commonPassword = hash("password123");

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@assetflow.com",
      passwordHash: hash("admin123"),
      role: "ADMIN",
    },
  });

  const managers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ravi Menon",
        email: "manager1@assetflow.com",
        passwordHash: commonPassword,
        role: "ASSET_MANAGER",
        departmentId: depts.it.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Neha Kapoor",
        email: "manager2@assetflow.com",
        passwordHash: commonPassword,
        role: "ASSET_MANAGER",
        departmentId: depts.facilities.id,
      },
    }),
  ]);

  const heads = await Promise.all([
    prisma.user.create({
      data: {
        name: "Priya Shah",
        email: "head1@assetflow.com",
        passwordHash: commonPassword,
        role: "DEPT_HEAD",
        departmentId: depts.engineering.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Arjun Rao",
        email: "head2@assetflow.com",
        passwordHash: commonPassword,
        role: "DEPT_HEAD",
        departmentId: depts.sales.id,
      },
    }),
  ]);

  // Point each department at its head now that those users exist.
  await prisma.department.update({
    where: { id: depts.engineering.id },
    data: { headId: heads[0].id },
  });
  await prisma.department.update({
    where: { id: depts.sales.id },
    data: { headId: heads[1].id },
  });

  const employeeDepts = [
    depts.engineering,
    depts.sales,
    depts.facilities,
    depts.it,
  ];
  const employees = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.user.create({
        data: {
          name: `Employee ${i + 1}`,
          email: `employee${i + 1}@assetflow.com`,
          passwordHash: commonPassword,
          role: "EMPLOYEE",
          departmentId: employeeDepts[i % employeeDepts.length].id,
        },
      })
    )
  );

  return { admin, managers, heads, employees };
}

async function main() {
  console.log("Wiping existing data...");
  await wipe();

  console.log("Seeding departments...");
  const departments = await seedDepartments();

  console.log("Seeding categories...");
  const categories = await seedCategories();

  console.log("Seeding users...");
  const users = await seedUsers(departments);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
