import { Card, Tag, Typography } from "antd";
import type { MaintenanceRequest } from "../api/maintenance";

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "red",
  MEDIUM: "orange",
  LOW: "default",
};

export default function MaintenanceCard({
  request,
}: {
  request: MaintenanceRequest;
}) {
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Typography.Text strong>
          {request.asset?.assetTag ?? "—"}
        </Typography.Text>
        <Tag color={PRIORITY_COLOR[request.priority] ?? "default"}>
          {request.priority}
        </Tag>
      </div>
      <Typography.Paragraph style={{ margin: "6px 0", fontSize: 13 }}>
        {request.description}
      </Typography.Paragraph>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {request.asset?.name} · raised by {request.raisedBy?.name ?? "—"}
      </Typography.Text>
    </Card>
  );
}
