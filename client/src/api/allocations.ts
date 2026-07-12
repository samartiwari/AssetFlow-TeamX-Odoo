import api from "./client";

export type Allocation = {
  id: string;
  assetId: string;
  holderId: string;
  allocatedAt: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
  conditionNotes: string | null;
  asset?: { id: string; assetTag: string; name: string };
  holder?: { id: string; name: string };
};

export type AllocateInput = {
  assetId: string;
  holderId: string;
  expectedReturnDate?: string;
};

// Thrown when the asset is already held. Carries who holds it so the UI can
// show the conflict banner and offer a transfer instead.
export type AllocationConflict = {
  heldBy: string;
  dept: string | null;
};

export async function fetchAllocations(params?: {
  open?: boolean;
  overdue?: boolean;
}): Promise<Allocation[]> {
  const { data } = await api.get("/api/allocations", {
    params: {
      open: params?.open ? "true" : undefined,
      overdue: params?.overdue ? "true" : undefined,
    },
  });
  return data.data.allocations;
}

export async function allocateAsset(input: AllocateInput): Promise<Allocation> {
  const { data } = await api.post("/api/allocations", input);
  return data.data.allocation;
}

export async function returnAllocation(
  id: string,
  conditionNotes?: string
): Promise<Allocation> {
  const { data } = await api.post(`/api/allocations/${id}/return`, {
    conditionNotes,
  });
  return data.data.allocation;
}

export type Transfer = {
  id: string;
  assetId: string;
  status: "REQUESTED" | "APPROVED" | "REALLOCATED";
  reason: string | null;
  asset?: { assetTag: string; name: string };
  fromUser?: { name: string };
  toUser?: { name: string };
};

export async function fetchTransfers(): Promise<Transfer[]> {
  const { data } = await api.get("/api/transfers");
  return data.data.transfers;
}

export async function createTransfer(input: {
  assetId: string;
  toUserId: string;
  reason?: string;
}): Promise<Transfer> {
  const { data } = await api.post("/api/transfers", input);
  return data.data.transfer;
}

export async function approveTransfer(id: string): Promise<Transfer> {
  const { data } = await api.patch(`/api/transfers/${id}`);
  return data.data.transfer;
}
