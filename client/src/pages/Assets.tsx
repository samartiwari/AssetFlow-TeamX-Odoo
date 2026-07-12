import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Input, Select, Space, Typography, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import { fetchAssets, type Asset, type AssetFilters } from "../api/assets";
import { fetchCategories } from "../api/org";
import StatusBadge from "../components/StatusBadge";
import { toLabel } from "../lib/format";
import RegisterAssetModal from "../components/RegisterAssetModal";
import AssetDetailDrawer from "../components/AssetDetailDrawer";
import { useAuth } from "../auth/AuthContext";

const STATUS_OPTIONS = [
  "AVAILABLE",
  "ALLOCATED",
  "RESERVED",
  "UNDER_MAINTENANCE",
  "LOST",
  "RETIRED",
  "DISPOSED",
];

export default function Assets() {
  const { user } = useAuth();
  const canRegister = user?.role === "ASSET_MANAGER" || user?.role === "ADMIN";

  const [filters, setFilters] = useState<AssetFilters>({});
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets", filters],
    queryFn: () => fetchAssets(filters),
  });

  const columns: ColumnsType<Asset> = useMemo(
    () => [
      { title: "Tag", dataIndex: "assetTag", width: 110 },
      { title: "Name", dataIndex: "name" },
      {
        title: "Category",
        dataIndex: ["category", "name"],
        render: (_, a) => a.category?.name ?? "—",
      },
      { title: "Serial", dataIndex: "serialNumber" },
      { title: "Location", dataIndex: "location" },
      {
        title: "Status",
        dataIndex: "status",
        width: 160,
        render: (status: string) => <StatusBadge status={status} />,
      },
    ],
    []
  );

  return (
    <div>
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
        wrap
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Assets
        </Typography.Title>
        {canRegister && (
          <Button type="primary" onClick={() => setRegisterOpen(true)}>
            Register Asset
          </Button>
        )}
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search tag, name, or serial"
          allowClear
          style={{ width: 260 }}
          onSearch={(q) => setFilters((f) => ({ ...f, q: q || undefined }))}
        />
        <Select
          placeholder="Category"
          allowClear
          style={{ width: 160 }}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(category) => setFilters((f) => ({ ...f, category }))}
        />
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 190 }}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: toLabel(s),
          }))}
          onChange={(status) => setFilters((f) => ({ ...f, status }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={assets}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => setSelectedId(record.id),
          style: { cursor: "pointer" },
        })}
      />

      <RegisterAssetModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
      />

      <AssetDetailDrawer
        assetId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
