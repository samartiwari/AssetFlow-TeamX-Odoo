import { Tag } from "antd";
import { statusColor } from "../theme/tokens";
import { useThemeMode } from "../theme/ThemeProvider";
import { toLabel } from "../lib/format";

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
