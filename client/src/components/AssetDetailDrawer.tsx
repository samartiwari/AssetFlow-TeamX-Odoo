import { useQuery } from "@tanstack/react-query";
import {
  Drawer,
  Descriptions,
  Tabs,
  Table,
  Spin,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { fetchAsset } from "../api/assets";
import StatusBadge from "./StatusBadge";

type Allocation = {
  id: string;
  allocatedAt: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
  holder: { name: string };
};

type Maintenance = {
  id: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  technician: { name: string } | null;
};

function fmt(d: string | null) {
  return d ? dayjs(d).format("DD MMM YYYY") : "—";
}

export default function AssetDetailDrawer({
  assetId,
  onClose,
}: {
  assetId: string | null;
  onClose: () => void;
}) {
  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => fetchAsset(assetId as string),
    enabled: !!assetId,
  });

  return (
    <Drawer
      title={asset ? `${asset.assetTag} · ${asset.name}` : "Asset"}
      open={!!assetId}
      onClose={onClose}
      width={560}
    >
      {isLoading || !asset ? (
        <Spin />
      ) : (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Status">
              <StatusBadge status={asset.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              {asset.category?.name ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Serial">
              {asset.serialNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {asset.location}
            </Descriptions.Item>
            <Descriptions.Item label="Condition">
              {asset.condition}
            </Descriptions.Item>
            <Descriptions.Item label="Acquired">
              {fmt(asset.acquisitionDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Bookable">
              {asset.isBookable ? "Yes" : "No"}
            </Descriptions.Item>
          </Descriptions>

          <Tabs
            items={[
              {
                key: "allocations",
                label: "Allocation History",
                children: (
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={(asset.allocations ?? []) as Allocation[]}
                    locale={{ emptyText: "No allocations yet" }}
                    columns={[
                      {
                        title: "Holder",
                        render: (_, a: Allocation) => a.holder?.name ?? "—",
                      },
                      {
                        title: "Allocated",
                        render: (_, a: Allocation) => fmt(a.allocatedAt),
                      },
                      {
                        title: "Returned",
                        render: (_, a: Allocation) =>
                          a.returnedAt ? fmt(a.returnedAt) : "Open",
                      },
                    ]}
                  />
                ),
              },
              {
                key: "maintenance",
                label: "Maintenance History",
                children: (
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={(asset.maintenance ?? []) as Maintenance[]}
                    locale={{ emptyText: "No maintenance yet" }}
                    columns={[
                      {
                        title: "Issue",
                        dataIndex: "description",
                        ellipsis: true,
                      },
                      { title: "Priority", dataIndex: "priority" },
                      {
                        title: "Status",
                        render: (_, m: Maintenance) => (
                          <Typography.Text>{m.status}</Typography.Text>
                        ),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </Space>
      )}
    </Drawer>
  );
}
