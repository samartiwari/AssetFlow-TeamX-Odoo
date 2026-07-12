import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { transitionAsset } from "../lib/assetLifecycle.js";
import { notify, logActivity } from "../lib/audit.js";

const router = Router();

// Current allocations (optionally only open, or only overdue). Drives the
// allocation history list and feeds the dashboard's overdue flag.
router.get("/", requireAuth, async (req, res) => {
  const { open, overdue } = req.query;

  const where: Record<string, unknown> = {};
  if (open === "true") where.returnedAt = null;
  if (overdue === "true") {
    where.returnedAt = null;
    where.expectedReturnDate = { lt: new Date() };
  }

  const allocations = await prisma.allocation.findMany({
    where,
    orderBy: { allocatedAt: "desc" },
    include: {
      asset: { select: { id: true, assetTag: true, name: true } },
      holder: { select: { id: true, name: true } },
    },
  });

  return ok(res, { allocations });
});

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

const returnSchema = z.object({
  conditionNotes: z.string().optional(),
});

// Return an allocated asset. Records the return time and condition notes, then
// flips the asset back to AVAILABLE — all in one transaction.
router.post(
  "/:id/return",
  requireAuth,
  requireRole("ASSET_MANAGER", "DEPT_HEAD", "ADMIN"),
  async (req, res) => {
    const id = String(req.params.id ?? "");
    if (!id) return fail(res, 400, "Missing allocation id");

    const parsed = returnSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "Invalid return details", {
        issues: parsed.error.issues,
      });
    }

    const allocation = await prisma.allocation.findUnique({ where: { id } });
    if (!allocation) return fail(res, 404, "Allocation not found");
    if (allocation.returnedAt) {
      return fail(res, 409, "This allocation has already been returned");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const done = await tx.allocation.update({
        where: { id },
        data: {
          returnedAt: new Date(),
          conditionNotes: parsed.data.conditionNotes ?? null,
        },
      });
      await transitionAsset(tx, allocation.assetId, "AVAILABLE");
      await logActivity(tx, req.user!.sub, "RETURN", "Asset", allocation.assetId);
      return done;
    });

    return ok(res, { allocation: updated });
  }
);

export default router;
