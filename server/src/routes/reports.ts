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

export default router;
