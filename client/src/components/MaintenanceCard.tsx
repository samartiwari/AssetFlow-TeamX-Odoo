import { Button, Card, Space, Tag, Typography } from "antd";
import type { MaintenanceRequest, MaintenanceStatus } from "../api/maintenance";

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "red",
  MEDIUM: "orange",
  LOW: "default",
};

type Action = { label: string; status: MaintenanceStatus; danger?: boolean };

// The buttons available from each status, mirroring the backend workflow.
const NEXT_ACTIONS: Record<MaintenanceStatus, Action[]> = {
  PENDING: [
    { label: "Approve", status: "APPROVED" },
    { label: "Reject", status: "REJECTED", danger: true },
  ],
  APPROVED: [{ label: "Assign Technician", status: "TECH_ASSIGNED" }],
  TECH_ASSIGNED: [{ label: "Start", status: "IN_PROGRESS" }],
  IN_PROGRESS: [{ label: "Resolve", status: "RESOLVED" }],
  REJECTED: [],
  RESOLVED: [],
};

type Props = {
  request: MaintenanceRequest;
  canManage: boolean;
  busy?: boolean;
  onAdvance: (status: MaintenanceStatus) => void;
};

export default function MaintenanceCard({
  request,
  canManage,
  busy,
  onAdvance,
}: Props) {
  const actions = NEXT_ACTIONS[request.status];

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

      {canManage && actions.length > 0 && (
        <Space style={{ marginTop: 10 }} wrap>
          {actions.map((a) => (
            <Button
              key={a.status}
              size="small"
              type={a.danger ? "default" : "primary"}
              danger={a.danger}
              loading={busy}
              onClick={() => onAdvance(a.status)}
            >
              {a.label}
            </Button>
          ))}
        </Space>
      )}
    </Card>
  );
}
