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

const router = Router();

const createSchema = z.object({
  scope: z.string().min(1, "Describe the audit scope"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  auditorIds: z.array(z.string().min(1)).min(1, "Assign at least one auditor"),
  location: z.string().optional(),
});

const verdictSchema = z.object({
  verdict: z.enum(["VERIFIED", "MISSING", "DAMAGED"]),
});

const itemInclude = {
  asset: {
    select: {
      id: true,
      assetTag: true,
      name: true,
      location: true,
      status: true,
    },
  },
} as const;

// Rolls an item list into the counts the UI shows as a discrepancy summary.
function summarize(items: { verdict: string | null }[]) {
  return {
    total: items.length,
    verified: items.filter((i) => i.verdict === "VERIFIED").length,
    missing: items.filter((i) => i.verdict === "MISSING").length,
    damaged: items.filter((i) => i.verdict === "DAMAGED").length,
    pending: items.filter((i) => i.verdict === null).length,
  };
}

// List cycles, newest first, each with a verdict summary for the overview list.
router.get("/", requireAuth, async (_req, res) => {
  const cycles = await prisma.auditCycle.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { verdict: true } } },
  });
  const shaped = cycles.map(({ items, ...cycle }) => ({
    ...cycle,
    summary: summarize(items),
  }));
  return ok(res, shaped);
});

// One cycle with its full checklist.
router.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    return fail(res, 400, "Missing cycle id");
  }
  const cycle = await prisma.auditCycle.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { asset: { assetTag: "asc" } },
        include: itemInclude,
      },
    },
  });
  if (!cycle) {
    return fail(res, 404, "Audit cycle not found");
  }
  const { items, ...rest } = cycle;
  return ok(res, { ...rest, items, summary: summarize(items) });
});

// Create a cycle — Admin only. Snapshots the in-scope assets into audit items so
// the checklist is fixed at cycle creation. `location` narrows the scope; without
// it every asset that can still be audited is included.
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid audit cycle", {
      issues: parsed.error.issues,
    });
  }
  const { scope, startDate, endDate, auditorIds, location } = parsed.data;
  if (endDate < startDate) {
    return fail(res, 400, "End date must be on or after the start date");
  }

  const where: Prisma.AssetWhereInput = {
    status: { notIn: ["RETIRED", "DISPOSED"] },
  };
  if (location) {
    where.location = { contains: location, mode: "insensitive" };
  }
  const assets = await prisma.asset.findMany({
    where,
    select: { id: true },
  });
  if (assets.length === 0) {
    return fail(res, 400, "No assets match this scope");
  }

  const cycle = await prisma.$transaction(async (tx) => {
    const created = await tx.auditCycle.create({
      data: { scope, startDate, endDate, auditorIds },
    });
    await tx.auditItem.createMany({
      data: assets.map((a) => ({ cycleId: created.id, assetId: a.id })),
    });
    await logActivity(tx, req.user!.sub, "AUDIT_CREATED", "AuditCycle", created.id);
    return created;
  });

  const withItems = await prisma.auditCycle.findUnique({
    where: { id: cycle.id },
    include: {
      items: {
        orderBy: { asset: { assetTag: "asc" } },
        include: itemInclude,
      },
    },
  });
  return ok(res, withItems, 201);
});

// Record a verdict for one item. Only an assigned auditor (or Admin) may mark, and
// only while the cycle is still open.
router.patch("/items/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    return fail(res, 400, "Missing item id");
  }
  const parsed = verdictSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid verdict", { issues: parsed.error.issues });
  }

  const item = await prisma.auditItem.findUnique({
    where: { id },
    include: { cycle: true },
  });
  if (!item) {
    return fail(res, 404, "Audit item not found");
  }
  if (item.cycle.status !== "OPEN") {
    return fail(res, 409, "This audit cycle is closed");
  }
  const isAuditor = item.cycle.auditorIds.includes(req.user!.sub);
  if (!isAuditor && req.user!.role !== "ADMIN") {
    return fail(res, 403, "Only assigned auditors can mark this cycle");
  }

  const updated = await prisma.auditItem.update({
    where: { id },
    data: { verdict: parsed.data.verdict },
    include: itemInclude,
  });
  return ok(res, updated);
});

// Close a cycle — Admin only. Locks it, flips confirmed-missing assets to LOST
// (skipping any whose current state can't legally move there), and drops a
// discrepancy notification to each auditor. Everything commits together.
router.post("/:id/close", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    return fail(res, 400, "Missing cycle id");
  }
  const cycle = await prisma.auditCycle.findUnique({
    where: { id },
    include: { items: { include: itemInclude } },
  });
  if (!cycle) {
    return fail(res, 404, "Audit cycle not found");
  }
  if (cycle.status !== "OPEN") {
    return fail(res, 409, "This audit cycle is already closed");
  }

  const summary = summarize(cycle.items);
  const missing = cycle.items.filter((i) => i.verdict === "MISSING");

  const closed = await prisma.$transaction(async (tx) => {
    for (const item of missing) {
      try {
        await transitionAsset(tx, item.assetId, "LOST");
      } catch (err) {
        if (!(err instanceof IllegalTransitionError)) throw err;
      }
    }
    const result = await tx.auditCycle.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    const note = `Audit "${cycle.scope}" closed: ${summary.missing} missing, ${summary.damaged} damaged`;
    for (const auditorId of cycle.auditorIds) {
      await notify(tx, auditorId, "AUDIT_DISCREPANCY", note);
    }
    await logActivity(tx, req.user!.sub, "AUDIT_CLOSED", "AuditCycle", id);
    return result;
  });

  return ok(res, { ...closed, summary });
});

export default router;
