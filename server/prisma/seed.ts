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

type Categories = Awaited<ReturnType<typeof seedCategories>>;

function tag(n: number) {
  return `AF-${String(n).padStart(4, "0")}`;
}

async function seedAssets(categories: Categories) {
  const conditions = ["Excellent", "Good", "Fair"];
  const locations = ["HQ Floor 1", "HQ Floor 2", "Warehouse", "Remote"];

  // A spread of names per category, plus a status distribution that leaves
  // most assets Available (so allocation/booking demos have stock) while still
  // showing every lifecycle state on the board.
  const specs: {
    name: string;
    categoryId: string;
    status: string;
    bookable?: boolean;
  }[] = [];

  const laptops = ["Dell Latitude", "MacBook Pro", "ThinkPad X1", "HP EliteBook"];
  laptops.forEach((name, i) =>
    specs.push({
      name: `${name} ${i + 1}`,
      categoryId: categories.electronics.id,
      status: i === 0 ? "ALLOCATED" : "AVAILABLE",
    })
  );

  const monitors = ["Dell UltraSharp", "LG 27\"", "Samsung Curved"];
  monitors.forEach((name, i) =>
    specs.push({
      name: `${name} Monitor ${i + 1}`,
      categoryId: categories.electronics.id,
      status: "AVAILABLE",
    })
  );

  const projectors = ["Epson Projector", "BenQ Projector"];
  projectors.forEach((name) =>
    specs.push({
      name,
      categoryId: categories.electronics.id,
      status: "AVAILABLE",
      bookable: true,
    })
  );

  const desks = ["Standing Desk", "Office Desk", "Conference Table"];
  desks.forEach((name, i) =>
    specs.push({
      name: `${name} ${i + 1}`,
      categoryId: categories.furniture.id,
      status: "AVAILABLE",
    })
  );

  const chairs = ["Ergonomic Chair", "Task Chair", "Executive Chair"];
  chairs.forEach((name, i) =>
    specs.push({
      name: `${name} ${i + 1}`,
      categoryId: categories.furniture.id,
      status: i === 0 ? "RETIRED" : "AVAILABLE",
    })
  );

  const rooms = ["Meeting Room A", "Meeting Room B", "Conference Hall"];
  rooms.forEach((name) =>
    specs.push({
      name,
      categoryId: categories.furniture.id,
      status: "AVAILABLE",
      bookable: true,
    })
  );

  const vehicles = ["Company Van", "Delivery Truck", "Pool Car"];
  vehicles.forEach((name, i) =>
    specs.push({
      name,
      categoryId: categories.vehicles.id,
      status: i === 0 ? "UNDER_MAINTENANCE" : "AVAILABLE",
      bookable: true,
    })
  );

  const equipment = [
    "Cordless Drill",
    "Ladder",
    "Generator",
    "Pressure Washer",
    "Toolkit",
    "Welding Machine",
    "Air Compressor",
    "Circular Saw",
  ];
  equipment.forEach((name, i) =>
    specs.push({
      name,
      categoryId: categories.equipment.id,
      status: i === 0 ? "LOST" : i === 1 ? "DISPOSED" : "AVAILABLE",
    })
  );

  const assets = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i]!;
    assets.push(
      await prisma.asset.create({
        data: {
          assetTag: tag(i + 1),
          name: s.name,
          categoryId: s.categoryId,
          serialNumber: `SN-${1000 + i}`,
          acquisitionDate: new Date(2023, i % 12, ((i * 7) % 27) + 1),
          cost: 5000 + ((i * 1234) % 45000),
          condition: conditions[i % conditions.length]!,
          location: locations[i % locations.length]!,
          status: s.status as never,
          isBookable: s.bookable ?? false,
        },
      })
    );
  }

  return assets;
}

type Users = Awaited<ReturnType<typeof seedUsers>>;
type Assets = Awaited<ReturnType<typeof seedAssets>>;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function seedActivity(users: Users, assets: Assets) {
  const allocated = assets.find((a) => a.status === "ALLOCATED")!;
  const priya = users.heads[0]!;
  const employee = users.employees[0]!;
  const employee2 = users.employees[1]!;

  // The allocated laptop is held by Priya — matches the double-allocation demo
  // scenario from the problem statement. Open allocation (returnedAt = null).
  await prisma.allocation.create({
    data: {
      assetId: allocated.id,
      holderId: priya.id,
      expectedReturnDate: daysFromNow(14),
    },
  });

  // A couple more open allocations, one deliberately overdue so the dashboard
  // has something to flag in red.
  const available = assets.filter((a) => a.status === "AVAILABLE");
  const overdueAsset = available[0]!;
  const currentAsset = available[1]!;

  await prisma.asset.update({
    where: { id: overdueAsset.id },
    data: { status: "ALLOCATED" },
  });
  await prisma.allocation.create({
    data: {
      assetId: overdueAsset.id,
      holderId: employee.id,
      expectedReturnDate: daysFromNow(-3), // overdue
    },
  });

  await prisma.asset.update({
    where: { id: currentAsset.id },
    data: { status: "ALLOCATED" },
  });
  await prisma.allocation.create({
    data: {
      assetId: currentAsset.id,
      holderId: employee2.id,
      expectedReturnDate: daysFromNow(7),
    },
  });

  // Bookings on a bookable resource, spaced so overlaps can be demoed against
  // real existing data.
  const room = assets.find((a) => a.isBookable && a.name.startsWith("Meeting"))!;
  await prisma.booking.create({
    data: {
      resourceId: room.id,
      bookedById: employee.id,
      startTime: daysFromNow(1),
      endTime: new Date(daysFromNow(1).getTime() + 60 * 60 * 1000),
      status: "UPCOMING",
    },
  });
  await prisma.booking.create({
    data: {
      resourceId: room.id,
      bookedById: users.employees[2]!.id,
      startTime: daysFromNow(2),
      endTime: new Date(daysFromNow(2).getTime() + 90 * 60 * 1000),
      status: "UPCOMING",
    },
  });

  // Maintenance mid-workflow: one pending approval, one already approved (the
  // asset seeded as UNDER_MAINTENANCE).
  const underMaintenance = assets.find(
    (a) => a.status === "UNDER_MAINTENANCE"
  )!;
  await prisma.maintenanceRequest.create({
    data: {
      assetId: underMaintenance.id,
      raisedById: employee.id,
      description: "Engine warning light on, needs inspection.",
      priority: "HIGH",
      status: "APPROVED",
      technicianId: users.managers[0]!.id,
    },
  });

  const pendingAsset = available[2]!;
  await prisma.maintenanceRequest.create({
    data: {
      assetId: pendingAsset.id,
      raisedById: employee2.id,
      description: "Screen flickers intermittently.",
      priority: "MEDIUM",
      status: "PENDING",
    },
  });
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

  console.log("Seeding assets...");
  const assets = await seedAssets(categories);

  console.log("Seeding allocations, bookings, and maintenance...");
  await seedActivity(users, assets);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
