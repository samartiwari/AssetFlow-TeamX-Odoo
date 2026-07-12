import { Card, Col, Row, Spin, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchUtilization } from "../api/reports";
import { useThemeMode } from "../theme/ThemeProvider";
import { chartColors } from "../theme/chartColors";

export default function Reports() {
  const { mode } = useThemeMode();
  const c = chartColors(mode);

  const { data: util, isLoading } = useQuery({
    queryKey: ["reports", "utilization"],
    queryFn: fetchUtilization,
  });

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Reports & Analytics
      </Typography.Title>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Utilization by department">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={util?.byDepartment ?? []}
                  margin={{ top: 8, right: 8, bottom: 8, left: -12 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={c.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 12, fill: c.axis }}
                    tickLine={false}
                    axisLine={{ stroke: c.grid }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: c.axis }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ fill: c.grid, opacity: 0.3 }}
                    contentStyle={{
                      background: c.surface,
                      border: `1px solid ${c.grid}`,
                      borderRadius: 8,
                      color: c.text,
                    }}
                    labelStyle={{ color: c.text }}
                  />
                  <Bar
                    dataKey="count"
                    fill={c.bar}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
