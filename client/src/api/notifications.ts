import api from "./client";

export type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  user?: { id: string; name: string };
};

export async function fetchNotifications(type?: string): Promise<{
  notifications: Notification[];
  unread: number;
}> {
  const { data } = await api.get("/api/notifications", {
    params: { type: type || undefined },
  });
  return data.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const { data } = await api.get("/api/activity-logs");
  return data.data.logs;
}
