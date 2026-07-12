import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const departmentInput = z.object({
  name: z.string().min(1, "Name is required"),
  headId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const departmentUpdate = departmentInput.partial();

const withRelations = {
  head: { select: { id: true, name: true } },
  parent: { select: { id: true, name: true } },
} as const;

// List — any signed-in user can read (this drives pickers on other screens).
router.get("/", requireAuth, async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: withRelations,
  });
  return ok(res, departments);
});

// Create — admin only.
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = departmentInput.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid department details", {
      issues: parsed.error.issues,
    });
  }
  const department = await prisma.department.create({
    data: parsed.data as Prisma.DepartmentUncheckedCreateInput,
    include: withRelations,
  });
  return ok(res, department, 201);
});

// Update / deactivate (status: "INACTIVE") — admin only.
router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    return fail(res, 400, "Missing department id");
  }
  const parsed = departmentUpdate.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid department details", {
      issues: parsed.error.issues,
    });
  }
  if (parsed.data.parentId && parsed.data.parentId === id) {
    return fail(res, 400, "A department cannot be its own parent");
  }
  try {
    const department = await prisma.department.update({
      where: { id },
      data: parsed.data as Prisma.DepartmentUncheckedUpdateInput,
      include: withRelations,
    });
    return ok(res, department);
  } catch {
    return fail(res, 404, "Department not found");
  }
});

export default router;
