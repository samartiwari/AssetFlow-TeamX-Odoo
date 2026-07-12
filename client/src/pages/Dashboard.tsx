import { useQuery } from "@tanstack/react-query";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Table,
  Tag,
  Space,
  Button,
  List,
} from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { fetchDashboard, type DashboardData } from "../api/dashboard";
import { toLabel } from "../lib/format";

const KPI_CARDS: { key: keyof DashboardData["kpis"]; label: string }[] = [
  { key: "available", label: "Assets Available" },
  { key: "allocated", label: "Assets Allocated" },
  { key: "maintenanceToday", label: "Maintenance Today" },
  { key: "activeBookings", label: "Active Bookings" },
  { key: "pendingTransfers", label: "Pending Transfers" },
  { key: "upcomingReturns", label: "Upcoming Returns" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const overdue = data?.overdue ?? [];
  const activity = data?.recentActivity ?? [];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space
        style={{ width: "100%", justifyContent: "space-between" }}
        wrap
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Dashboard
        </Typography.Title>
        <Space wrap>
          <Button type="primary" onClick={() => navigate("/assets")}>
            Register Asset
          </Button>
          <Button onClick={() => navigate("/booking")}>Book Resource</Button>
          <Button onClick={() => navigate("/maintenance")}>
            Raise Maintenance
          </Button>
        </Space>
      </Space>

      <Row gutter={[16, 16]}>
        {KPI_CARDS.map((c) => (
          <Col xs={12} sm={8} lg={4} key={c.key}>
            <Card loading={isLoading}>
              <Statistic title={c.label} value={data?.kpis[c.key] ?? 0} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={
          <Space>
            <span>Overdue Returns</span>
            {overdue.length > 0 && (
              <Tag color="error">{overdue.length} overdue</Tag>
            )}
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={overdue}
          locale={{ emptyText: "Nothing overdue — all returns are on time." }}
          pagination={false}
          columns={[
            {
              title: "Asset",
              render: (_, r) =>
                `${r.asset?.assetTag ?? ""} ${r.asset?.name ?? ""}`,
            },
            { title: "Held by", render: (_, r) => r.holder?.name ?? "—" },
            {
              title: "Was due",
              render: (_, r) => (
                <Typography.Text type="danger">
                  {r.expectedReturnDate
                    ? dayjs(r.expectedReturnDate).format("DD MMM YYYY")
                    : "—"}
                </Typography.Text>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Recent Activity">
        <List
          size="small"
          loading={isLoading}
          dataSource={activity}
          locale={{ emptyText: "No recent activity yet." }}
          renderItem={(a) => (
            <List.Item>
              <Space>
                <Tag>{toLabel(a.action)}</Tag>
                <Typography.Text>
                  {a.user?.name ?? "Someone"} · {a.entityType}
                </Typography.Text>
              </Space>
              <Typography.Text type="secondary">
                {dayjs(a.createdAt).format("DD MMM, HH:mm")}
              </Typography.Text>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
