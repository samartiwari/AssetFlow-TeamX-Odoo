import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Tabs,
  List,
  Tag,
  Typography,
  Button,
  Space,
  Table,
  Empty,
} from "antd";
import dayjs from "dayjs";
import {
  fetchNotifications,
  markNotificationRead,
  fetchActivityLogs,
  type Notification,
  type ActivityLog,
} from "../api/notifications";
import { useAuth } from "../auth/AuthContext";

// Groups raw notification types into the feed's filter tabs.
const FILTERS: { key: string; label: string; match: (t: string) => boolean }[] =
  [
    { key: "all", label: "All", match: () => true },
    {
      key: "approvals",
      label: "Approvals",
      match: (t) => t.includes("APPROVED") || t.includes("TRANSFER"),
    },
    {
      key: "assignments",
      label: "Assignments",
      match: (t) => t.includes("ASSIGNED") || t.includes("ALLOCAT"),
    },
    {
      key: "bookings",
      label: "Bookings",
      match: (t) => t.includes("BOOKING"),
    },
  ];

function NotificationFeed() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState("all");

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
  });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const filter = FILTERS.find((f) => f.key === active) ?? FILTERS[0];
  const items = (data?.notifications ?? []).filter((n) => filter.match(n.type));

  return (
    <Tabs
      activeKey={active}
      onChange={setActive}
      items={FILTERS.map((f) => ({
        key: f.key,
        label: f.label,
        children: (
          <List
            dataSource={items}
            locale={{ emptyText: <Empty description="No notifications" /> }}
            renderItem={(n: Notification) => (
              <List.Item
                actions={
                  n.read
                    ? []
                    : [
                        <Button
                          key="read"
                          size="small"
                          type="link"
                          onClick={() => markRead.mutate(n.id)}
                        >
                          Mark read
                        </Button>,
                      ]
                }
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag>{n.type.replace(/_/g, " ")}</Tag>
                      {!n.read && <Tag color="blue">New</Tag>}
                    </Space>
                  }
                  description={n.message}
                />
                <Typography.Text type="secondary">
                  {dayjs(n.createdAt).format("DD MMM, HH:mm")}
                </Typography.Text>
              </List.Item>
            )}
          />
        ),
      }))}
    />
  );
}

function ActivityLogTable() {
  const { data: logs = [] } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: fetchActivityLogs,
  });

  return (
    <Table
      rowKey="id"
      size="small"
      dataSource={logs}
      pagination={{ pageSize: 15 }}
      columns={[
        { title: "Who", render: (_, l: ActivityLog) => l.user?.name ?? "—" },
        { title: "Action", dataIndex: "action" },
        { title: "Entity", render: (_, l: ActivityLog) => l.entityType },
        {
          title: "When",
          render: (_, l: ActivityLog) =>
            dayjs(l.createdAt).format("DD MMM, HH:mm"),
        },
      ]}
    />
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const canSeeLog =
    user?.role === "ASSET_MANAGER" ||
    user?.role === "DEPT_HEAD" ||
    user?.role === "ADMIN";

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Notifications & Activity
      </Typography.Title>

      <Tabs
        items={[
          {
            key: "feed",
            label: "Notifications",
            children: <NotificationFeed />,
          },
          ...(canSeeLog
            ? [
                {
                  key: "log",
                  label: "Activity Log",
                  children: <ActivityLogTable />,
                },
              ]
            : []),
        ]}
      />
    </Space>
  );
}
