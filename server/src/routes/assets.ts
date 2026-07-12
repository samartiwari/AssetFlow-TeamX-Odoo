import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createAssetSchema } from "../lib/assets.js";
import { nextAssetTag } from "../lib/assetTag.js";

const router = Router();

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
