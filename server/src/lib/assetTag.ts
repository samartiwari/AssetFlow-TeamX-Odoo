import type { Prisma } from "../../generated/prisma/client.js";

// Asset tags look like AF-0001 and increment across the whole system. We derive
// the next number from the current highest tag rather than a counter table, so
// there's nothing extra to keep in sync. The lookup runs inside the same
// transaction as the insert (see routes/assets.ts) so two concurrent
// registrations can't land on the same number.
export async function nextAssetTag(tx: Prisma.TransactionClient): Promise<string> {
  const latest = await tx.asset.findFirst({
    where: { assetTag: { startsWith: "AF-" } },
    orderBy: { assetTag: "desc" },
    select: { assetTag: true },
  });

  const current = latest ? parseInt(latest.assetTag.slice(3), 10) : 0;
  const next = Number.isNaN(current) ? 1 : current + 1;
  return `AF-${String(next).padStart(4, "0")}`;
}
