import { useQuery } from "@tanstack/react-query";
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space } from "antd";
import dayjs from "dayjs";
import { fetchDashboard, type DashboardData } from "../api/dashboard";

const KPI_CARDS: { key: keyof DashboardData["kpis"]; label: string }[] = [
  { key: "available", label: "Assets Available" },
  { key: "allocated", label: "Assets Allocated" },
  { key: "maintenanceToday", label: "Maintenance Today" },
  { key: "activeBookings", label: "Active Bookings" },
  { key: "pendingTransfers", label: "Pending Transfers" },
  { key: "upcomingReturns", label: "Upcoming Returns" },
];

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const overdue = data?.overdue ?? [];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Dashboard
      </Typography.Title>

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
    </Space>
  );
}
