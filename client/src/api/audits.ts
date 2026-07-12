import api from "./client";

export type AuditVerdict = "VERIFIED" | "MISSING" | "DAMAGED";

export type AuditSummary = {
  total: number;
  verified: number;
  missing: number;
  damaged: number;
  pending: number;
};

export type AuditItem = {
  id: string;
  verdict: AuditVerdict | null;
  asset: {
    id: string;
    assetTag: string;
    name: string;
    location: string;
    status: string;
  };
};

export type AuditCycle = {
  id: string;
  scope: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  auditorIds: string[];
  createdAt: string;
  summary: AuditSummary;
};

export type AuditCycleDetail = AuditCycle & { items: AuditItem[] };

export type CreateCycleInput = {
  scope: string;
  startDate: string;
  endDate: string;
  auditorIds: string[];
  location?: string;
};

export async function fetchAuditCycles(): Promise<AuditCycle[]> {
  const { data } = await api.get("/api/audits");
  return data.data;
}

export async function fetchAuditCycle(id: string): Promise<AuditCycleDetail> {
  const { data } = await api.get(`/api/audits/${id}`);
  return data.data;
}

export async function createAuditCycle(
  input: CreateCycleInput
): Promise<AuditCycleDetail> {
  const { data } = await api.post("/api/audits", input);
  return data.data;
}

export async function setVerdict(
  itemId: string,
  verdict: AuditVerdict
): Promise<AuditItem> {
  const { data } = await api.patch(`/api/audits/items/${itemId}`, { verdict });
  return data.data;
}

export async function closeAuditCycle(
  id: string
): Promise<AuditCycle> {
  const { data } = await api.post(`/api/audits/${id}/close`);
  return data.data;
}
