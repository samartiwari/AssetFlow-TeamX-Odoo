import { Button, Card, Col, List, Row, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  fetchBookingHeatmap,
  fetchMaintenanceReport,
  fetchUtilization,
  type BookingHeatmap,
  type MaintenanceReport,
  type Utilization,
} from "../api/reports";
import SimpleBarChart from "../components/reports/SimpleBarChart";
import BookingHeatmapGrid from "../components/reports/BookingHeatmapGrid";
import StatusBadge from "../components/StatusBadge";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function rowBetween(left: React.ReactNode, right: React.ReactNode) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8 }}>
      {left}
      {right}
    </div>
  );
}

function cell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function buildReportCsv(
  util: Utilization,
  maint: MaintenanceReport,
  heat: BookingHeatmap
): string {
  const lines: string[] = [];
  lines.push("Utilization by Department");
  lines.push("Department,Active Allocations");
  util.byDepartment.forEach((d) => lines.push(`${cell(d.department)},${d.count}`));
  lines.push("");
  lines.push("Most-Used Assets");
  lines.push("Asset Tag,Name,Uses");
  util.mostUsed.forEach((a) => lines.push(`${cell(a.assetTag)},${cell(a.name)},${a.uses}`));
  lines.push("");
  lines.push("Idle Assets");
  lines.push("Asset Tag,Name,Days Idle");
  util.idle.forEach((a) =>
    lines.push(`${cell(a.assetTag)},${cell(a.name)},${a.daysIdle ?? "never used"}`)
  );
  lines.push("");
  lines.push("Maintenance Frequency by Category");
  lines.push("Category,Requests");
  maint.maintenanceFrequency.forEach((m) => lines.push(`${cell(m.category)},${m.count}`));
  lines.push("");
  lines.push("Due for Maintenance");
  lines.push("Asset Tag,Name,Status,Priority");
  maint.dueForMaintenance.forEach((a) =>
    lines.push(`${cell(a.assetTag)},${cell(a.name)},${a.status},${a.priority}`)
  );
  lines.push("");
  lines.push("Nearing Retirement");
  lines.push("Asset Tag,Name,Age (years)");
  maint.nearingRetirement.forEach((a) =>
    lines.push(`${cell(a.assetTag)},${cell(a.name)},${a.ageYears}`)
  );
  lines.push("");
  lines.push("Booking Heatmap");
  lines.push("Weekday,Hour,Bookings");
  heat.cells.forEach((x) =>
    lines.push(`${DAYS[x.weekday] ?? x.weekday},${x.hour},${x.count}`)
  );
  return lines.join("\n");
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
  const heat = heatQ.data;
  const ready = Boolean(util && maint && heat);

  const onExport = () => {
    if (!util || !maint || !heat) return;
    const csv = buildReportCsv(util, maint, heat);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assetflow-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Reports & Analytics
        </Typography.Title>
        <Button type="primary" onClick={onExport} disabled={!ready}>
          Export report
        </Button>
      </div>

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
            {heat && <BookingHeatmapGrid data={heat} />}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
