import { useState } from "react";
import { Button, Spin, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchMaintenance, type MaintenanceStatus } from "../api/maintenance";
import MaintenanceCard from "../components/MaintenanceCard";
import RaiseMaintenanceModal from "../components/RaiseMaintenanceModal";

const COLUMNS: { key: MaintenanceStatus; title: string }[] = [
  { key: "PENDING", title: "Pending" },
  { key: "APPROVED", title: "Approved" },
  { key: "TECH_ASSIGNED", title: "Technician Assigned" },
  { key: "IN_PROGRESS", title: "In Progress" },
  { key: "RESOLVED", title: "Resolved" },
];

export default function Maintenance() {
  const [raiseOpen, setRaiseOpen] = useState(false);
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: fetchMaintenance,
  });

  const columns = COLUMNS.map((col) => ({
    ...col,
    items: requests.filter((r) => r.status === col.key),
  }));

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
          Maintenance
        </Typography.Title>
        <Button type="primary" onClick={() => setRaiseOpen(true)}>
          Raise Request
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
          {columns.map((col) => (
            <div key={col.key} style={{ minWidth: 260, flex: "1 0 260px" }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>
                {col.title}{" "}
                <Tag style={{ marginInlineStart: 4 }}>{col.items.length}</Tag>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.items.map((r) => (
                  <MaintenanceCard key={r.id} request={r} />
                ))}
                {col.items.length === 0 && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    None
                  </Typography.Text>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RaiseMaintenanceModal
        open={raiseOpen}
        onClose={() => setRaiseOpen(false)}
      />
    </div>
  );
}
