import type { PrismaClient } from "../../generated/prisma/client.js";
import type { AssetStatus } from "../../generated/prisma/enums.js";

// The single source of truth for how an asset can move between lifecycle states.
// Every status change in the app (allocate, return, maintenance approve/resolve,
// audit close, retire, dispose) must go through here so illegal transitions are
// impossible and the rules live in one auditable place.
//
// Reading the map: a status maps to the set of states it may transition INTO.
const TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  AVAILABLE: ["ALLOCATED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "RETIRED"],
  ALLOCATED: ["AVAILABLE", "UNDER_MAINTENANCE", "LOST"],
  RESERVED: ["ALLOCATED", "AVAILABLE", "LOST"],
  UNDER_MAINTENANCE: ["AVAILABLE", "RETIRED", "DISPOSED"],
  LOST: ["AVAILABLE", "DISPOSED"],
  RETIRED: ["DISPOSED"],
  DISPOSED: [],
};

// True if `to` is a legal next state from `from`. Moving to the same state is
// treated as a no-op and allowed.
export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export class IllegalTransitionError extends Error {
  constructor(
    public from: AssetStatus,
    public to: AssetStatus
  ) {
    super(`Cannot move an asset from ${from} to ${to}`);
    this.name = "IllegalTransitionError";
  }
}

type Client = PrismaClient | Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

// Moves an asset to a new status, rejecting illegal transitions. Accepts either
// the base client or a transaction client so callers can bundle the status
// change with their other writes (allocation row, notification, activity log)
// in one atomic operation.
export async function transitionAsset(
  client: Client,
  assetId: string,
  to: AssetStatus
) {
  const asset = await client.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error(`Asset ${assetId} not found`);

  if (!canTransition(asset.status, to)) {
    throw new IllegalTransitionError(asset.status, to);
  }

  return client.asset.update({
    where: { id: assetId },
    data: { status: to },
  });
}
