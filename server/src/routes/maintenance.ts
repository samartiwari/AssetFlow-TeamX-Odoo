import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

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

export default router;
