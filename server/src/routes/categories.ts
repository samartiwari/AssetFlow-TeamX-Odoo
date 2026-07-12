import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const categoryInput = z.object({
  name: z.string().min(1, "Name is required"),
  // Optional category-specific field definitions (e.g. warranty period).
  customFields: z.record(z.string(), z.unknown()).nullable().optional(),
});

const categoryUpdate = categoryInput.partial();

// List — any signed-in user (drives the category picker on the Assets screen).
router.get("/", requireAuth, async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assets: true } } },
  });
  return ok(res, categories);
});

// Create — admin only.
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = categoryInput.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid category details", {
      issues: parsed.error.issues,
    });
  }
  const category = await prisma.category.create({
    data: parsed.data as Prisma.CategoryUncheckedCreateInput,
  });
  return ok(res, category, 201);
});

// Update — admin only.
router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    return fail(res, 400, "Missing category id");
  }
  const parsed = categoryUpdate.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid category details", {
      issues: parsed.error.issues,
    });
  }
  try {
    const category = await prisma.category.update({
      where: { id },
      data: parsed.data as Prisma.CategoryUncheckedUpdateInput,
    });
    return ok(res, category);
  } catch {
    return fail(res, 404, "Category not found");
  }
});

export default router;
