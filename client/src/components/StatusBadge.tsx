import { Tag } from "antd";
import { statusColor } from "../theme/tokens";
import { useThemeMode } from "../theme/ThemeProvider";

// Turns UNDER_MAINTENANCE / "under maintenance" into "Under Maintenance".
function toLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status }: { status: string }) {
  const { mode } = useThemeMode();
  if (!status) return null;

  const color = statusColor(status, mode);

  return (
    <Tag
      color={color}
      style={{ borderRadius: 12, fontWeight: 500, marginInlineEnd: 0 }}
    >
      {toLabel(status)}
    </Tag>
  );
}
