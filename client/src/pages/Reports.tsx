import { Card, Col, List, Row, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  fetchBookingHeatmap,
  fetchMaintenanceReport,
  fetchUtilization,
} from "../api/reports";
import SimpleBarChart from "../components/reports/SimpleBarChart";
import BookingHeatmapGrid from "../components/reports/BookingHeatmapGrid";
import StatusBadge from "../components/StatusBadge";

function rowBetween(left: React.ReactNode, right: React.ReactNode) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8 }}>
      {left}
      {right}
    </div>
  );
}

export default function Reports() {
  const utilQ = useQuery({
    queryKey: ["reports", "utilization"],
    queryFn: fetchUtilization,
  });
  const maintQ = useQuery({
    queryKey: ["reports", "maintenance"],
    queryFn: fetchMaintenanceReport,
  });
  const heatQ = useQuery({
    queryKey: ["reports", "heatmap"],
    queryFn: fetchBookingHeatmap,
  });

  const util = utilQ.data;
  const maint = maintQ.data;

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Reports & Analytics
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Utilization by department" loading={utilQ.isLoading}>
            <SimpleBarChart
              data={util?.byDepartment ?? []}
              xKey="department"
              barKey="count"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Maintenance frequency by category"
            loading={maintQ.isLoading}
          >
            <SimpleBarChart
              data={maint?.maintenanceFrequency ?? []}
              xKey="category"
              barKey="count"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Most-used assets" loading={utilQ.isLoading}>
            <List
              size="small"
              locale={{ emptyText: "No data" }}
              dataSource={util?.mostUsed ?? []}
              renderItem={(a) =>
                <List.Item>
                  {rowBetween(
                    <span><b>{a.assetTag}</b> · {a.name}</span>,
                    <Typography.Text type="secondary">{a.uses} uses</Typography.Text>
                  )}
                </List.Item>
              }
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Idle assets" loading={utilQ.isLoading}>
            <List
              size="small"
              locale={{ emptyText: "No idle assets" }}
              dataSource={util?.idle ?? []}
              renderItem={(a) =>
                <List.Item>
                  {rowBetween(
                    <span><b>{a.assetTag}</b> · {a.name}</span>,
                    <Typography.Text type="secondary">
                      {a.daysIdle === null ? "never used" : `${a.daysIdle}d idle`}
                    </Typography.Text>
                  )}
                </List.Item>
              }
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Due for maintenance" loading={maintQ.isLoading}>
            <List
              size="small"
              locale={{ emptyText: "Nothing open" }}
              dataSource={maint?.dueForMaintenance ?? []}
              renderItem={(a) =>
                <List.Item>
                  {rowBetween(
                    <span><b>{a.assetTag}</b> · {a.name}</span>,
                    <StatusBadge status={a.status} />
                  )}
                </List.Item>
              }
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Nearing retirement" loading={maintQ.isLoading}>
            <List
              size="small"
              locale={{ emptyText: "No data" }}
              dataSource={maint?.nearingRetirement ?? []}
              renderItem={(a) =>
                <List.Item>
                  {rowBetween(
                    <span><b>{a.assetTag}</b> · {a.name}</span>,
                    <Typography.Text type="secondary">{a.ageYears} yrs</Typography.Text>
                  )}
                </List.Item>
              }
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Booking heatmap (peak usage windows)" loading={heatQ.isLoading}>
            {heatQ.data && <BookingHeatmapGrid data={heatQ.data} />}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
