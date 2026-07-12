import { Fragment } from "react";
import { Tooltip, Typography } from "antd";
import { chartColors } from "../../theme/chartColors";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { BookingHeatmap } from "../../api/reports";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 – 20:00

// Weekday x hour grid. Magnitude shown as intensity of a single brand hue
// (sequential), so peak windows read at a glance.
export default function BookingHeatmapGrid({ data }: { data: BookingHeatmap }) {
  const { mode } = useThemeMode();
  const c = chartColors(mode);

  const max = Math.max(1, ...data.cells.map((x) => x.count));
  const countAt = (weekday: number, hour: number) =>
    data.cells.find((x) => x.weekday === weekday && x.hour === hour)?.count ?? 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `44px repeat(${HOURS.length}, 1fr)`,
          gap: 3,
          minWidth: 560,
        }}
      >
        <div />
        {HOURS.map((h) => (
          <div
            key={h}
            style={{ fontSize: 11, color: c.axis, textAlign: "center" }}
          >
            {h}
          </div>
        ))}

        {DAYS.map((day, weekday) => (
          <Fragment key={day}>
            <div
              style={{
                fontSize: 11,
                color: c.axis,
                display: "flex",
                alignItems: "center",
              }}
            >
              {day}
            </div>
            {HOURS.map((h) => {
              const count = countAt(weekday, h);
              const intensity = count === 0 ? 0.25 : 0.2 + 0.8 * (count / max);
              return (
                <Tooltip
                  key={h}
                  title={
                    count > 0
                      ? `${day} ${h}:00 — ${count} booking${count > 1 ? "s" : ""}`
                      : undefined
                  }
                >
                  <div
                    style={{
                      height: 22,
                      borderRadius: 4,
                      background: count > 0 ? c.bar : c.grid,
                      opacity: intensity,
                    }}
                  />
                </Tooltip>
              );
            })}
          </Fragment>
        ))}
      </div>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, display: "block", marginTop: 10 }}
      >
        Peak: {DAYS[data.peak.weekday]} {data.peak.hour}:00 ·{" "}
        {data.peak.count} booking{data.peak.count === 1 ? "" : "s"}
      </Typography.Text>
    </div>
  );
}
