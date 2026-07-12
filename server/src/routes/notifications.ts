import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// The signed-in user's own notifications, newest first. Optional `type` filter
// backs the feed's tab filters (Alerts / Approvals / Bookings).
router.get("/", requireAuth, async (req, res) => {
  const { type } = req.query;

  const where: Record<string, unknown> = { userId: req.user!.sub };
  if (typeof type === "string" && type) where.type = type;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const unread = notifications.filter((n) => !n.read).length;
  return ok(res, { notifications, unread });
});

// Mark one of the user's notifications as read.
router.patch("/:id/read", requireAuth, async (req, res) => {
  const id = String(req.params.id ?? "");
  if (!id) return fail(res, 400, "Missing notification id");

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== req.user!.sub) {
    return fail(res, 404, "Notification not found");
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return ok(res, { notification: updated });
});

export default router;
