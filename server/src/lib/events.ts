import type { PrismaClient } from "../../generated/prisma/client.js";

// Accept either the base client or a transaction client so a caller can bundle
// the notification / log write into the same atomic operation as its domain
// changes (e.g. creating a booking and notifying the booker in one tx).
type Client =
  | PrismaClient
  | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// Writes a notification row for a user. `type` is a stable machine string
// (e.g. BOOKING_CONFIRMED) that the notifications screen can filter on.
export function notify(
  client: Client,
  input: { userId: string; type: string; message: string }
) {
  return client.notification.create({ data: input });
}

// Appends an audit-trail entry: who did what, to which entity. Used across the
// app so every meaningful action is traceable from one place.
export function logActivity(
  client: Client,
  input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
  }
) {
  return client.activityLog.create({ data: input });
}
