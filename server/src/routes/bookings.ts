import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { notify, logActivity } from "../lib/audit.js";
import {
  createBookingSchema,
  rescheduleBookingSchema,
  BookingError,
  BookingConflictError,
} from "../lib/bookings.js";
import type { Role } from "../../generated/prisma/enums.js";

const router = Router();

const resourceSelect = { id: true, name: true, assetTag: true } as const;
const bookerSelect = { id: true, name: true } as const;
const bookingInclude = {
  resource: { select: resourceSelect },
  bookedBy: { select: bookerSelect },
} as const;

const ELEVATED: Role[] = ["ADMIN", "ASSET_MANAGER", "DEPT_HEAD"];

// Shape the conflicting booking returned on a 409 so the client can render an
// exact "clashes with …" message.
type Conflict = {
  id: string;
  startTime: Date;
  endTime: Date;
  bookedBy: { id: string; name: string };
};

// List bookings, optionally scoped to one resource (the calendar view passes
// ?resourceId=). Ordered by start time so the timeline reads top to bottom.
router.get("/", requireAuth, async (req, res) => {
  const { resourceId } = req.query;

  const where: Record<string, unknown> = {};
  if (typeof resourceId === "string" && resourceId) where.resourceId = resourceId;

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { startTime: "asc" },
  });

  return ok(res, { bookings });
});

// Book a slot. The overlap check and the insert run in one transaction so two
// concurrent requests for the same window can't both succeed. Cancelled
// bookings are ignored when checking for clashes.
router.post("/", requireAuth, async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid booking details", {
      issues: parsed.error.issues,
    });
  }

  const { resourceId, startTime, endTime } = parsed.data;
  const userId = req.user!.sub;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const resource = await tx.asset.findUnique({ where: { id: resourceId } });
      if (!resource) throw new BookingError(404, "Resource not found");
      if (!resource.isBookable) {
        throw new BookingError(400, "This asset is not a bookable resource");
      }

      const conflict = await tx.booking.findFirst({
        where: {
          resourceId,
          status: { not: "CANCELLED" },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          bookedBy: { select: bookerSelect },
        },
        orderBy: { startTime: "asc" },
      });
      if (conflict) throw new BookingConflictError<Conflict>(conflict);

      const created = await tx.booking.create({
        data: { resourceId, bookedById: userId, startTime, endTime },
        include: bookingInclude,
      });

      await notify(
        tx,
        userId,
        "BOOKING_CONFIRMED",
        `Booking confirmed for ${resource.name}`
      );
      await logActivity(tx, userId, "BOOKING_CREATED", "Booking", created.id);

      return created;
    });

    return ok(res, { booking }, 201);
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return fail(res, 409, "This time slot overlaps an existing booking", {
        conflict: err.conflict,
      });
    }
    if (err instanceof BookingError) {
      return fail(res, err.status, err.message);
    }
    throw err;
  }
});

// Cancel a booking. The booker can cancel their own; managers/heads can cancel
// any. Cancelling frees the slot (it's excluded from future overlap checks).
router.patch("/:id/cancel", requireAuth, async (req, res) => {
  const id = String(req.params.id ?? "");
  const userId = req.user!.sub;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return fail(res, 404, "Booking not found");
  if (booking.status === "CANCELLED") {
    return fail(res, 400, "Booking is already cancelled");
  }
  if (booking.bookedById !== userId && !ELEVATED.includes(req.user!.role)) {
    return fail(res, 403, "You can only cancel your own bookings");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: bookingInclude,
    });
    await notify(
      tx,
      booking.bookedById,
      "BOOKING_CANCELLED",
      `Booking cancelled for ${b.resource.name}`
    );
    await logActivity(tx, userId, "BOOKING_CANCELLED", "Booking", id);
    return b;
  });

  return ok(res, { booking: updated });
});

// Move a booking to a new slot. Re-runs the overlap check against every other
// active booking on the resource (excluding this one) inside a transaction.
router.patch("/:id/reschedule", requireAuth, async (req, res) => {
  const id = String(req.params.id ?? "");
  const userId = req.user!.sub;

  const parsed = rescheduleBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid booking details", {
      issues: parsed.error.issues,
    });
  }
  const { startTime, endTime } = parsed.data;

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return fail(res, 404, "Booking not found");
  if (existing.status === "CANCELLED") {
    return fail(res, 400, "A cancelled booking cannot be rescheduled");
  }
  if (existing.bookedById !== userId && !ELEVATED.includes(req.user!.role)) {
    return fail(res, 403, "You can only reschedule your own bookings");
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          resourceId: existing.resourceId,
          id: { not: id },
          status: { not: "CANCELLED" },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          bookedBy: { select: bookerSelect },
        },
        orderBy: { startTime: "asc" },
      });
      if (conflict) throw new BookingConflictError<Conflict>(conflict);

      const updated = await tx.booking.update({
        where: { id },
        data: { startTime, endTime },
        include: bookingInclude,
      });
      await logActivity(tx, userId, "BOOKING_RESCHEDULED", "Booking", id);
      return updated;
    });

    return ok(res, { booking });
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return fail(res, 409, "This time slot overlaps an existing booking", {
        conflict: err.conflict,
      });
    }
    throw err;
  }
});

export default router;
