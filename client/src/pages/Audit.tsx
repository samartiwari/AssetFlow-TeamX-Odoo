import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeAuditCycle,
  fetchAuditCycle,
  fetchAuditCycles,
  setVerdict,
  type AuditCycle,
  type AuditItem,
  type AuditVerdict,
} from "../api/audits";
import NewAuditCycleModal from "../components/NewAuditCycleModal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../lib/format";

const VERDICTS: AuditVerdict[] = ["VERIFIED", "MISSING", "DAMAGED"];

function dateRange(cycle: { startDate: string; endDate: string }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString();
  return `${fmt(cycle.startDate)} – ${fmt(cycle.endDate)}`;
}

export default function Audit() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["auditCycles"],
    queryFn: fetchAuditCycles,
  });

  // Default the selection to the newest cycle once the list loads.
  useEffect(() => {
    if (!selectedId && cycles.length > 0) {
      setSelectedId(cycles[0].id);
    }
  }, [cycles, selectedId]);

  const { data: cycle, isLoading: loadingCycle } = useQuery({
    queryKey: ["auditCycle", selectedId],
    queryFn: () => fetchAuditCycle(selectedId!),
    enabled: !!selectedId,
  });

  const mark = useMutation({
    mutationFn: ({ itemId, verdict }: { itemId: string; verdict: AuditVerdict }) =>
      setVerdict(itemId, verdict),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auditCycle", selectedId] });
      qc.invalidateQueries({ queryKey: ["auditCycles"] });
    },
    onError: (err) => message.error(errorMessage(err, "Could not save verdict")),
  });

  const close = useMutation({
    mutationFn: () => closeAuditCycle(selectedId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auditCycle", selectedId] });
      qc.invalidateQueries({ queryKey: ["auditCycles"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      message.success("Audit cycle closed");
    },
    onError: (err) => message.error(errorMessage(err, "Could not close cycle")),
  });

  const isOpen = cycle?.status === "OPEN";
  const canMark =
    isOpen && (isAdmin || (!!user && (cycle?.auditorIds ?? []).includes(user.id)));

  const columns = [
    {
      title: "Asset",
      key: "asset",
      render: (_: unknown, item: AuditItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{item.asset.assetTag}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.asset.name}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Expected location",
      dataIndex: ["asset", "location"],
      key: "location",
    },
    {
      title: "Current status",
      key: "status",
      render: (_: unknown, item: AuditItem) => (
        <StatusBadge status={item.asset.status} />
      ),
    },
    {
      title: "Verification",
      key: "verdict",
      render: (_: unknown, item: AuditItem) =>
        canMark ? (
          <Segmented<string>
            size="small"
            value={item.verdict ?? ""}
            onChange={(value) =>
              mark.mutate({ itemId: item.id, verdict: value as AuditVerdict })
            }
            options={VERDICTS.map((v) => ({
              label: v.charAt(0) + v.slice(1).toLowerCase(),
              value: v,
            }))}
          />
        ) : item.verdict ? (
          <StatusBadge status={item.verdict} />
        ) : (
          <Typography.Text type="secondary">Pending</Typography.Text>
        ),
    },
  ];

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
          Asset Audit
        </Typography.Title>
        {isAdmin && (
          <Button type="primary" onClick={() => setModalOpen(true)}>
            New Audit Cycle
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : cycles.length === 0 ? (
        <Card>
          <Empty description="No audit cycles yet">
            {isAdmin && (
              <Button type="primary" onClick={() => setModalOpen(true)}>
                Create the first cycle
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 260px", maxWidth: 320, minWidth: 240 }}>
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              {cycles.map((c) => (
                <CycleListItem
                  key={c.id}
                  cycle={c}
                  active={c.id === selectedId}
                  onSelect={() => setSelectedId(c.id)}
                />
              ))}
            </Space>
          </div>

          <div style={{ flex: "3 1 480px", minWidth: 300 }}>
            {loadingCycle || !cycle ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <Spin />
              </div>
            ) : (
              <Card
                title={
                  <Space wrap>
                    <span>{cycle.scope}</span>
                    <Tag color={isOpen ? "blue" : "default"}>{cycle.status}</Tag>
                  </Space>
                }
                extra={
                  isAdmin &&
                  isOpen && (
                    <Popconfirm
                      title="Close this cycle?"
                      description="Missing assets will be marked Lost. This can't be undone."
                      okText="Close cycle"
                      onConfirm={() => close.mutate()}
                    >
                      <Button danger loading={close.isPending}>
                        Close Audit Cycle
                      </Button>
                    </Popconfirm>
                  )
                }
              >
                <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  {dateRange(cycle)} · {cycle.auditorIds.length} auditor
                  {cycle.auditorIds.length === 1 ? "" : "s"}
                </Typography.Paragraph>

                {cycle.summary.missing + cycle.summary.damaged > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`${
                      cycle.summary.missing + cycle.summary.damaged
                    } asset(s) flagged — discrepancy report`}
                    description={`${cycle.summary.missing} missing · ${cycle.summary.damaged} damaged · ${cycle.summary.verified} verified · ${cycle.summary.pending} pending`}
                  />
                )}

                <Table
                  rowKey="id"
                  size="small"
                  columns={columns}
                  dataSource={cycle.items}
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  scroll={{ x: "max-content" }}
                />
              </Card>
            )}
          </div>
        </div>
      )}

      <NewAuditCycleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(id) => setSelectedId(id)}
      />
    </div>
  );
}

function CycleListItem({
  cycle,
  active,
  onSelect,
}: {
  cycle: AuditCycle;
  active: boolean;
  onSelect: () => void;
}) {
  const flagged = cycle.summary.missing + cycle.summary.damaged;
  return (
    <Card
      size="small"
      hoverable
      onClick={onSelect}
      styles={{ body: { padding: 12 } }}
      style={active ? { borderColor: "var(--ant-color-primary)" } : undefined}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Typography.Text strong ellipsis style={{ maxWidth: 180 }}>
          {cycle.scope}
        </Typography.Text>
        <Tag color={cycle.status === "OPEN" ? "blue" : "default"}>
          {cycle.status}
        </Tag>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {dateRange(cycle)}
      </Typography.Text>
      {flagged > 0 && (
        <div style={{ marginTop: 4 }}>
          <Tag color="warning" style={{ margin: 0 }}>
            {flagged} flagged
          </Tag>
        </div>
      )}
    </Card>
  );
}
