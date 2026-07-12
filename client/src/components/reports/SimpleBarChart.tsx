import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors } from "../../theme/chartColors";
import { useThemeMode } from "../../theme/ThemeProvider";

// Single-series bar chart (magnitude). One brand hue, no legend — the card title
// names it. Theme-aware colors and hover tooltip.
export default function SimpleBarChart({
  data,
  xKey,
  barKey,
}: {
  data: object[];
  xKey: string;
  barKey: string;
}) {
  const { mode } = useThemeMode();
  const c = chartColors(mode);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis
          dataKey={xKey}
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
        <Bar dataKey={barKey} fill={c.bar} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
