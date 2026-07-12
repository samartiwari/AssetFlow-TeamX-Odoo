import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
} as const;

const userUpdate = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  departmentId: z.string().nullable().optional(),
});

const roleUpdate = z.object({
  role: z.enum(["EMPLOYEE", "DEPT_HEAD", "ASSET_MANAGER", "ADMIN"]),
});

// Directory list — any signed-in user (drives employee pickers elsewhere).
router.get("/", requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: publicUser,
  });
  return ok(res, users);
});

// Update status / department / name — admin only.
router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    return fail(res, 400, "Missing user id");
  }
  const parsed = userUpdate.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid user details", {
      issues: parsed.error.issues,
    });
  }
  try {
    const user = await prisma.user.update({
      where: { id },
      data: parsed.data as Prisma.UserUncheckedUpdateInput,
      select: publicUser,
    });
    return ok(res, user);
  } catch {
    return fail(res, 404, "User not found");
  }
});

// Assign a role (promote/demote) — admin only. This is the ONLY place roles change.
router.patch(
  "/:id/role",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string") {
      return fail(res, 400, "Missing user id");
    }
    const parsed = roleUpdate.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "Invalid role", { issues: parsed.error.issues });
    }
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { role: parsed.data.role },
        select: publicUser,
      });
      return ok(res, user);
    } catch {
      return fail(res, 404, "User not found");
    }
  }
);

export default router;
