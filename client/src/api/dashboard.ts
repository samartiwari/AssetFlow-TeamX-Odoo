import api from "./client";

export type DashboardData = {
  kpis: {
    available: number;
    allocated: number;
    maintenanceToday: number;
    activeBookings: number;
    pendingTransfers: number;
    upcomingReturns: number;
  };
  overdue: {
    id: string;
    expectedReturnDate: string | null;
    asset?: { assetTag: string; name: string };
    holder?: { name: string };
  }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user?: { name: string };
  }[];
};

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get("/api/dashboard");
  return data.data;
}
