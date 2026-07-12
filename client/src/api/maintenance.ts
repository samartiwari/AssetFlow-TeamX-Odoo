import api from "./client";

export type MaintenanceStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "TECH_ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED";

export type MaintenanceRequest = {
  id: string;
  assetId: string;
  description: string;
  priority: string;
  status: MaintenanceStatus;
  technicianId: string | null;
  createdAt: string;
  asset: { id: string; assetTag: string; name: string } | null;
  raisedBy: { id: string; name: string } | null;
  technician: { id: string; name: string } | null;
};

export type RaiseInput = {
  assetId: string;
  description: string;
  priority: string;
};

export async function fetchMaintenance(): Promise<MaintenanceRequest[]> {
  const { data } = await api.get("/api/maintenance");
  return data.data;
}

export async function raiseMaintenance(
  input: RaiseInput
): Promise<MaintenanceRequest> {
  const { data } = await api.post("/api/maintenance", input);
  return data.data;
}

export async function advanceMaintenance(
  id: string,
  status: MaintenanceStatus,
  technicianId?: string
): Promise<MaintenanceRequest> {
  const body: { status: MaintenanceStatus; technicianId?: string } = { status };
  if (technicianId) body.technicianId = technicianId;
  const { data } = await api.patch(`/api/maintenance/${id}`, body);
  return data.data;
}
