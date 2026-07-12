import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  transitionAsset,
  IllegalTransitionError,
} from "../lib/assetLifecycle.js";
import { notify, logActivity } from "../lib/audit.js";
import type { MaintenanceStatus } from "../../generated/prisma/enums.js";

const router = Router();

const createSchema = z.object({
  assetId: z.string().min(1, "Select an asset"),
  description: z.string().min(1, "Describe the issue"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const withRelations = {
  asset: { select: { id: true, assetTag: true, name: true } },
  raisedBy: { select: { id: true, name: true } },
  technician: { select: { id: true, name: true } },
} as const;

// List — powers the kanban board. Optional ?assetId scopes to one asset's history.
router.get("/", requireAuth, async (req, res) => {
  const { assetId } = req.query;
  const where: Prisma.MaintenanceRequestWhereInput = {};
  if (typeof assetId === "string" && assetId) {
    where.assetId = assetId;
  }
  const requests = await prisma.maintenanceRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: withRelations,
  });
  return ok(res, requests);
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    return fail(res, 400, "Missing request id");
  }
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: withRelations,
  });
  if (!request) {
    return fail(res, 404, "Maintenance request not found");
  }
  return ok(res, request);
});

// Raise a request — any signed-in user (the holder reports the issue).
router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid maintenance request", {
      issues: parsed.error.issues,
    });
  }
  const asset = await prisma.asset.findUnique({
    where: { id: parsed.data.assetId },
  });
  if (!asset) {
    return fail(res, 404, "Asset not found");
  }

  const request = await prisma.maintenanceRequest.create({
    data: {
      assetId: parsed.data.assetId,
      description: parsed.data.description,
      priority: parsed.data.priority,
      raisedById: req.user!.sub,
    },
    include: withRelations,
  });
  return ok(res, request, 201);
});

const transitionSchema = z.object({
  status: z.enum([
    "APPROVED",
    "REJECTED",
    "TECH_ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
  ]),
  technicianId: z.string().nullable().optional(),
});

// Which statuses a request may move into next.
const MAINT_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["TECH_ASSIGNED"],
  TECH_ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  REJECTED: [],
  RESOLVED: [],
};

// Notification copy per target status.
const NOTIF: Record<string, { type: string; verb: string }> = {
  APPROVED: { type: "MAINTENANCE_APPROVED", verb: "approved" },
  REJECTED: { type: "MAINTENANCE_REJECTED", verb: "rejected" },
  TECH_ASSIGNED: { type: "MAINTENANCE_UPDATED", verb: "assigned to a technician" },
  IN_PROGRESS: { type: "MAINTENANCE_UPDATED", verb: "started" },
  RESOLVED: { type: "MAINTENANCE_UPDATED", verb: "resolved" },
};

// Advance a request through the workflow. Manager/admin only. Approving flips the
// asset to Under Maintenance and resolving flips it back to Available; the status
// change, notification, and activity log all happen in one transaction.
router.patch(
  "/:id",
  requireAuth,
  requireRole("ASSET_MANAGER", "ADMIN"),
  async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string") {
      return fail(res, 400, "Missing request id");
    }
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "Invalid status change", {
        issues: parsed.error.issues,
      });
    }
    const target = parsed.data.status;

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: { select: { assetTag: true } } },
    });
    if (!request) {
      return fail(res, 404, "Maintenance request not found");
    }
    if (!MAINT_TRANSITIONS[request.status].includes(target)) {
      return fail(
        res,
        409,
        `Cannot move a request from ${request.status} to ${target}`
      );
    }

    const updateData: Prisma.MaintenanceRequestUncheckedUpdateInput = {
      status: target,
    };
    if (target === "TECH_ASSIGNED" && parsed.data.technicianId) {
      updateData.technicianId = parsed.data.technicianId;
    }

    const notif = NOTIF[target]!;
    const tag = request.asset.assetTag;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        if (target === "APPROVED") {
          await transitionAsset(tx, request.assetId, "UNDER_MAINTENANCE");
        }
        if (target === "RESOLVED") {
          await transitionAsset(tx, request.assetId, "AVAILABLE");
        }
        const result = await tx.maintenanceRequest.update({
          where: { id },
          data: updateData,
          include: withRelations,
        });
        await notify(
          tx,
          request.raisedById,
          notif.type,
          `Maintenance for ${tag} was ${notif.verb}`
        );
        await logActivity(
          tx,
          req.user!.sub,
          `MAINTENANCE_${target}`,
          "MaintenanceRequest",
          id
        );
        return result;
      });
      return ok(res, updated);
    } catch (err) {
      if (err instanceof IllegalTransitionError) {
        return fail(res, 409, err.message);
      }
      throw err;
    }
  }
);

export default router;
