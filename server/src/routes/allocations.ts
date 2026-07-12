import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { transitionAsset } from "../lib/assetLifecycle.js";
import { notify, logActivity } from "../lib/audit.js";

const router = Router();

const allocateSchema = z.object({
  assetId: z.string().min(1),
  holderId: z.string().min(1),
  expectedReturnDate: z.coerce.date().optional(),
});

// Allocate an asset to a holder. Asset managers and department heads can do
// this. The core rule: an asset with an open allocation (returnedAt = null)
// cannot be allocated again — the whole check + write runs in one transaction
// so two simultaneous requests can't both slip through.
router.post(
  "/",
  requireAuth,
  requireRole("ASSET_MANAGER", "DEPT_HEAD", "ADMIN"),
  async (req, res) => {
    const parsed = allocateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "Invalid allocation details", {
        issues: parsed.error.issues,
      });
    }
    const { assetId, holderId, expectedReturnDate } = parsed.data;

    try {
      const allocation = await prisma.$transaction(async (tx) => {
        // Is the asset already held? Look for an allocation still open.
        const open = await tx.allocation.findFirst({
          where: { assetId, returnedAt: null },
          include: {
            holder: {
              select: { name: true, department: { select: { name: true } } },
            },
          },
        });
        if (open) {
          // Surface who holds it so the UI can show the conflict banner.
          const conflict = {
            heldBy: open.holder.name,
            dept: open.holder.department?.name ?? null,
          };
          throw Object.assign(new Error("ALREADY_ALLOCATED"), { conflict });
        }

        const created = await tx.allocation.create({
          data: { assetId, holderId, expectedReturnDate: expectedReturnDate ?? null },
        });

        await transitionAsset(tx, assetId, "ALLOCATED");
        await notify(
          tx,
          holderId,
          "ASSET_ASSIGNED",
          "An asset has been allocated to you."
        );
        await logActivity(tx, req.user!.sub, "ALLOCATE", "Asset", assetId);

        return created;
      });

      return ok(res, { allocation }, 201);
    } catch (err) {
      if (err instanceof Error && err.message === "ALREADY_ALLOCATED") {
        const { conflict } = err as Error & {
          conflict: { heldBy: string; dept: string | null };
        };
        return fail(res, 409, "Asset is already allocated", conflict);
      }
      throw err;
    }
  }
);

export default router;
