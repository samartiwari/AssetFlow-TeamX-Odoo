import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createAssetSchema } from "../lib/assets.js";
import { nextAssetTag } from "../lib/assetTag.js";

const router = Router();

// List assets with optional search and filters. `q` matches tag, name, or
// serial number; the rest are exact-match filters. Everyone signed in can
// browse the directory.
router.get("/", requireAuth, async (req, res) => {
  const { q, category, status, location } = req.query;

  const where: Record<string, unknown> = {};
  if (typeof q === "string" && q.trim()) {
    const term = q.trim();
    where.OR = [
      { assetTag: { contains: term, mode: "insensitive" } },
      { name: { contains: term, mode: "insensitive" } },
      { serialNumber: { contains: term, mode: "insensitive" } },
    ];
  }
  if (typeof category === "string" && category) where.categoryId = category;
  if (typeof status === "string" && status) where.status = status;
  if (typeof location === "string" && location) where.location = location;

  const assets = await prisma.asset.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
    orderBy: { assetTag: "asc" },
  });

  return ok(res, { assets });
});

// Full detail for one asset, including its allocation and maintenance history
// (newest first) so the detail view can show both timelines.
router.get("/:id", requireAuth, async (req, res) => {
  const asset = await prisma.asset.findUnique({
    where: { id: req.params.id },
    include: {
      category: { select: { id: true, name: true } },
      allocations: {
        orderBy: { allocatedAt: "desc" },
        include: { holder: { select: { id: true, name: true } } },
      },
      maintenance: {
        orderBy: { createdAt: "desc" },
        include: {
          raisedBy: { select: { id: true, name: true } },
          technician: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!asset) return fail(res, 404, "Asset not found");
  return ok(res, { asset });
});

// Register a new asset. Only asset managers and admins can add stock. The tag
// is generated and the row inserted in one transaction so concurrent
// registrations get distinct tags.
router.post(
  "/",
  requireAuth,
  requireRole("ASSET_MANAGER", "ADMIN"),
  async (req, res) => {
    const parsed = createAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "Invalid asset details", {
        issues: parsed.error.issues,
      });
    }

    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return fail(res, 400, "Category not found");
    }

    const asset = await prisma.$transaction(async (tx) => {
      const assetTag = await nextAssetTag(tx);
      return tx.asset.create({
        data: { ...parsed.data, assetTag },
      });
    });

    return ok(res, { asset }, 201);
  }
);

export default router;
