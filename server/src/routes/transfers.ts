import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notify, logActivity } from "../lib/audit.js";

const router = Router();

// List transfer requests, newest first. Managers use this to see what's pending.
router.get("/", requireAuth, async (_req, res) => {
  const transfers = await prisma.transferRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      asset: { select: { id: true, assetTag: true, name: true } },
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  });
  return ok(res, { transfers });
});

const createSchema = z.object({
  assetId: z.string().min(1),
  toUserId: z.string().min(1),
  reason: z.string().optional(),
});

// Raise a transfer request. Anyone signed in can ask for a transfer of an asset
// they hold to someone else; the `from` party is the current holder.
router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid transfer request");
  }
  const { assetId, toUserId, reason } = parsed.data;

  const open = await prisma.allocation.findFirst({
    where: { assetId, returnedAt: null },
  });
  if (!open) {
    return fail(res, 400, "That asset isn't currently allocated to anyone");
  }

  const transfer = await prisma.transferRequest.create({
    data: {
      assetId,
      fromUserId: open.holderId,
      toUserId,
      reason: reason ?? null,
    },
  });

  return ok(res, { transfer }, 201);
});

// Approve a transfer. On approval the asset is re-allocated: the old allocation
// is closed and a fresh one opened for the new holder, so the allocation history
// reflects the handover. Managers and department heads only.
router.patch(
  "/:id",
  requireAuth,
  requireRole("ASSET_MANAGER", "DEPT_HEAD", "ADMIN"),
  async (req, res) => {
    const id = String(req.params.id ?? "");
    if (!id) return fail(res, 400, "Missing transfer id");

    const transfer = await prisma.transferRequest.findUnique({ where: { id } });
    if (!transfer) return fail(res, 404, "Transfer not found");
    if (transfer.status !== "REQUESTED") {
      return fail(res, 400, "This transfer has already been decided");
    }

    // APPROVE → re-allocate in one transaction.
    const result = await prisma.$transaction(async (tx) => {
      // Close the current holder's allocation.
      await tx.allocation.updateMany({
        where: { assetId: transfer.assetId, returnedAt: null },
        data: { returnedAt: new Date() },
      });
      // Open a new allocation for the incoming holder.
      await tx.allocation.create({
        data: { assetId: transfer.assetId, holderId: transfer.toUserId },
      });
      const updated = await tx.transferRequest.update({
        where: { id },
        data: { status: "REALLOCATED" },
      });
      await notify(
        tx,
        transfer.toUserId,
        "TRANSFER_APPROVED",
        "A transfer to you was approved."
      );
      await logActivity(tx, req.user!.sub, "TRANSFER", "Asset", transfer.assetId);
      return updated;
    });

    return ok(res, { transfer: result });
  }
);

export default router;
