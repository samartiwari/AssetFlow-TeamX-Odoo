import type { PrismaClient } from "../../generated/prisma/client.js";

// Accepts either the base client or a transaction client so notifications and
// activity-log rows are written in the SAME transaction as the mutation that
// caused them — either everything commits or nothing does.
type Client =
  | PrismaClient
  | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// Drops a notification in a user's feed. `type` is a short tag the UI filters
// on (e.g. "ASSET_ASSIGNED", "TRANSFER_APPROVED").
export function notify(
  client: Client,
  userId: string,
  type: string,
  message: string
) {
  return client.notification.create({
    data: { userId, type, message },
  });
}

// Records who did what, to which entity. Feeds the activity log screen.
export function logActivity(
  client: Client,
  userId: string,
  action: string,
  entityType: string,
  entityId: string
) {
  return client.activityLog.create({
    data: { userId, action, entityType, entityId },
  });
}
