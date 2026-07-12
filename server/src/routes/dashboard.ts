import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// One call that powers the whole dashboard: the KPI counts, the overdue-return
// list (kept separate so the UI can highlight it), and a slice of recent
// activity. Everything a signed-in user needs for the operational snapshot.
router.get("/", requireAuth, async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    available,
    allocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdue,
    recentActivity,
  ] = await Promise.all([
    prisma.asset.count({ where: { status: "AVAILABLE" } }),
    prisma.asset.count({ where: { status: "ALLOCATED" } }),
    // Maintenance requests created today.
    prisma.maintenanceRequest.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.booking.count({
      where: { status: { in: ["UPCOMING", "ONGOING"] } },
    }),
    prisma.transferRequest.count({ where: { status: "REQUESTED" } }),
    // Open allocations due back but not yet overdue.
    prisma.allocation.count({
      where: {
        returnedAt: null,
        expectedReturnDate: { gte: now },
      },
    }),
    // Overdue: open allocations past their expected return date.
    prisma.allocation.findMany({
      where: {
        returnedAt: null,
        expectedReturnDate: { lt: now },
      },
      orderBy: { expectedReturnDate: "asc" },
      include: {
        asset: { select: { assetTag: true, name: true } },
        holder: { select: { name: true } },
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return ok(res, {
    kpis: {
      available,
      allocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
    },
    overdue,
    recentActivity,
  });
});

export default router;
