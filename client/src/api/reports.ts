import api from "./client";

export type Utilization = {
  byDepartment: { department: string; count: number }[];
  mostUsed: { assetTag: string; name: string; uses: number }[];
  idle: { assetTag: string; name: string; daysIdle: number | null }[];
};

export type MaintenanceReport = {
  maintenanceFrequency: { category: string; count: number }[];
  dueForMaintenance: {
    assetTag: string;
    name: string;
    status: string;
    priority: string;
  }[];
  nearingRetirement: { assetTag: string; name: string; ageYears: number }[];
};

export type BookingHeatmap = {
  cells: { weekday: number; hour: number; count: number }[];
  peak: { weekday: number; hour: number; count: number };
};

export async function fetchUtilization(): Promise<Utilization> {
  const { data } = await api.get("/api/reports/utilization");
  return data.data;
}

export async function fetchMaintenanceReport(): Promise<MaintenanceReport> {
  const { data } = await api.get("/api/reports/maintenance");
  return data.data;
}

export async function fetchBookingHeatmap(): Promise<BookingHeatmap> {
  const { data } = await api.get("/api/reports/booking-heatmap");
  return data.data;
}
