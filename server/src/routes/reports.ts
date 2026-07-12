import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const IDLE_DAYS = 30;

// Utilization overview: active allocations per department, the most-used assets,
// and idle assets (available and unused for a while). Manager/admin only.
router.get(
  "/utilization",
  requireAuth,
  requireRole("ADMIN", "ASSET_MANAGER", "DEPT_HEAD"),
  async (_req, res) => {
    // Department-wise summary of what's currently allocated.
    const active = await prisma.allocation.findMany({
      where: { returnedAt: null },
      select: {
        holder: { select: { department: { select: { name: true } } } },
      },
    });
    const deptCounts = new Map<string, number>();
    for (const a of active) {
      const name = a.holder.department?.name ?? "Unassigned";
      deptCounts.set(name, (deptCounts.get(name) ?? 0) + 1);
    }
    const byDepartment = [...deptCounts.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((x, y) => y.count - x.count);

    // Most-used assets by all-time allocation count.
    const grouped = await prisma.allocation.groupBy({
      by: ["assetId"],
      _count: true,
    });
    const topIds = grouped
      .slice()
      .sort((x, y) => y._count - x._count)
      .slice(0, 5);
    const topAssets = await prisma.asset.findMany({
      where: { id: { in: topIds.map((t) => t.assetId) } },
      select: { id: true, assetTag: true, name: true },
    });
    const assetById = new Map(topAssets.map((a) => [a.id, a]));
    const mostUsed = topIds
      .map((t) => {
        const asset = assetById.get(t.assetId);
        if (!asset) return null;
        return { assetTag: asset.assetTag, name: asset.name, uses: t._count };
      })
      .filter(
        (x): x is { assetTag: string; name: string; uses: number } => x !== null
      );

    // Idle assets: available and not used in a while (or never).
    const availableAssets = await prisma.asset.findMany({
      where: { status: "AVAILABLE" },
      select: {
        assetTag: true,
        name: true,
        allocations: {
          orderBy: { allocatedAt: "desc" },
          take: 1,
          select: { allocatedAt: true, returnedAt: true },
        },
      },
    });
    const now = Date.now();
    const idle = availableAssets
      .map((a) => {
        const last = a.allocations[0];
        const lastUsed = last?.returnedAt ?? last?.allocatedAt;
        const daysIdle = lastUsed
          ? Math.floor((now - lastUsed.getTime()) / 86_400_000)
          : null;
        return { assetTag: a.assetTag, name: a.name, daysIdle };
      })
      .filter((x) => x.daysIdle === null || x.daysIdle >= IDLE_DAYS)
      .sort((x, y) => (y.daysIdle ?? 1e9) - (x.daysIdle ?? 1e9))
      .slice(0, 10);

    return ok(res, { byDepartment, mostUsed, idle });
  }
);

// Maintenance analytics: how often each category breaks, which assets have an
// open maintenance request right now, and which assets are oldest (nearing
// retirement). Manager/admin only.
router.get(
  "/maintenance",
  requireAuth,
  requireRole("ADMIN", "ASSET_MANAGER", "DEPT_HEAD"),
  async (_req, res) => {
    // Maintenance frequency grouped by the asset's category.
    const requests = await prisma.maintenanceRequest.findMany({
      select: { asset: { select: { category: { select: { name: true } } } } },
    });
    const catCounts = new Map<string, number>();
    for (const r of requests) {
      const name = r.asset.category.name;
      catCounts.set(name, (catCounts.get(name) ?? 0) + 1);
    }
    const maintenanceFrequency = [...catCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((x, y) => y.count - x.count);

    // Assets with an open maintenance request (needing attention now).
    const openReqs = await prisma.maintenanceRequest.findMany({
      where: {
        status: { in: ["PENDING", "APPROVED", "TECH_ASSIGNED", "IN_PROGRESS"] },
      },
      select: {
        status: true,
        priority: true,
        asset: { select: { assetTag: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const dueForMaintenance = openReqs.map((r) => ({
      assetTag: r.asset.assetTag,
      name: r.asset.name,
      status: r.status,
      priority: r.priority,
    }));

    // Oldest active assets (nearing retirement), by acquisition age.
    const assets = await prisma.asset.findMany({
      where: { status: { notIn: ["RETIRED", "DISPOSED"] } },
      select: { assetTag: true, name: true, acquisitionDate: true },
    });
    const now = Date.now();
    const nearingRetirement = assets
      .map((a) => ({
        assetTag: a.assetTag,
        name: a.name,
        ageYears:
          Math.round(
            ((now - a.acquisitionDate.getTime()) / (365.25 * 86_400_000)) * 10
          ) / 10,
      }))
      .sort((x, y) => y.ageYears - x.ageYears)
      .slice(0, 10);

    return ok(res, { maintenanceFrequency, dueForMaintenance, nearingRetirement });
  }
);

// Booking heatmap: how many bookings occupy each weekday/hour slot (peak usage
// windows). Cancelled bookings are excluded. Manager/admin only.
router.get(
  "/booking-heatmap",
  requireAuth,
  requireRole("ADMIN", "ASSET_MANAGER", "DEPT_HEAD"),
  async (_req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { startTime: true, endTime: true },
    });

    // Count each hour a booking spans on its weekday.
    const counts = new Map<string, number>();
    for (const b of bookings) {
      const weekday = b.startTime.getDay();
      const startHour = b.startTime.getHours();
      const endHour = b.endTime.getHours();
      const stop = endHour > startHour ? endHour : startHour + 1;
      for (let h = startHour; h < stop; h++) {
        const key = `${weekday}-${h}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    let peak = { weekday: 0, hour: 0, count: 0 };
    const cells = [...counts.entries()].map(([key, count]) => {
      const [weekday, hour] = key.split("-").map(Number) as [number, number];
      if (count > peak.count) peak = { weekday, hour, count };
      return { weekday, hour, count };
    });

    return ok(res, { cells, peak });
  }
);

export default router;
