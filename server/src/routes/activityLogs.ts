import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Full activity log — who did what, to which entity, when. Restricted to
// managers and admins since it spans the whole organization.
router.get(
  "/",
  requireAuth,
  requireRole("ASSET_MANAGER", "DEPT_HEAD", "ADMIN"),
  async (_req, res) => {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, name: true } } },
    });
    return ok(res, { logs });
  }
);

export default router;
