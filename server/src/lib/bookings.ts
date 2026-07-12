import { z } from "zod";

// A booking must have a positive-length slot: the end has to come after the
// start. Times arrive as ISO strings and are coerced to Date.
const slot = {
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
};

const endAfterStart = (d: { startTime: Date; endTime: Date }) =>
  d.endTime > d.startTime;
const endAfterStartError = {
  message: "End time must be after start time",
  path: ["endTime"] as string[],
};

export const createBookingSchema = z
  .object({ resourceId: z.string().min(1), ...slot })
  .refine(endAfterStart, endAfterStartError);

export const rescheduleBookingSchema = z
  .object(slot)
  .refine(endAfterStart, endAfterStartError);

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;

// Two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap when each
// starts before the other ends. Back-to-back slots (10:00–11:00 after
// 09:00–10:00) do NOT overlap because the comparisons are strict.
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// A resource is missing or not bookable.
export class BookingError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "BookingError";
  }
}

// The requested slot clashes with an existing booking. Carries that booking so
// the API can tell the client exactly what it conflicts with.
export class BookingConflictError<T> extends Error {
  constructor(public conflict: T) {
    super("Booking slot conflict");
    this.name = "BookingConflictError";
  }
}
