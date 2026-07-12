import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Alert,
  Space,
  Typography,
  Table,
  App,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { AxiosError } from "axios";
import {
  allocateAsset,
  fetchAllocations,
  createTransfer,
  type AllocationConflict,
  type Allocation,
} from "../api/allocations";
import { fetchAssets } from "../api/assets";
import { fetchUsers } from "../api/org";

export default function AllocationTransfer() {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Holds the conflict returned by a 409 so we can render the red banner and
  // offer a transfer instead of a second allocation.
  const [conflict, setConflict] = useState<
    (AllocationConflict & { assetId: string; toUserId: string }) | null
  >(null);

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", "all"],
    queryFn: () => fetchAssets({}),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations", "open"],
    queryFn: () => fetchAllocations({ open: true }),
  });

  const allocate = useMutation({
    mutationFn: allocateAsset,
    onSuccess: () => {
      message.success("Asset allocated");
      setConflict(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (err: AxiosError<{ error: string } & AllocationConflict>, vars) => {
      if (err.response?.status === 409) {
        const data = err.response.data;
        setConflict({
          heldBy: data.heldBy,
          dept: data.dept,
          assetId: vars.assetId,
          toUserId: vars.holderId,
        });
      } else {
        message.error("Could not allocate the asset");
      }
    },
  });

  const transfer = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      message.success("Transfer request submitted");
      setConflict(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: () => message.error("Could not submit the transfer"),
  });

  function onFinish(values: {
    assetId: string;
    holderId: string;
    expectedReturnDate?: Dayjs;
  }) {
    setConflict(null);
    allocate.mutate({
      assetId: values.assetId,
      holderId: values.holderId,
      expectedReturnDate: values.expectedReturnDate?.toISOString(),
    });
  }

  const columns = [
    {
      title: "Asset",
      render: (_: unknown, a: Allocation) =>
        `${a.asset?.assetTag ?? ""} ${a.asset?.name ?? ""}`,
    },
    { title: "Holder", render: (_: unknown, a: Allocation) => a.holder?.name },
    {
      title: "Expected Return",
      render: (_: unknown, a: Allocation) =>
        a.expectedReturnDate
          ? dayjs(a.expectedReturnDate).format("DD MMM YYYY")
          : "—",
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Allocation & Transfer
      </Typography.Title>

      <Card title="Allocate an asset" style={{ maxWidth: 560 }}>
        {conflict && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Already allocated to ${conflict.heldBy}${
              conflict.dept ? ` (${conflict.dept})` : ""
            }`}
            description="You can't allocate an asset that's already taken. Request a transfer instead."
            action={
              <Button
                danger
                size="small"
                loading={transfer.isPending}
                onClick={() =>
                  transfer.mutate({
                    assetId: conflict.assetId,
                    toUserId: conflict.toUserId,
                  })
                }
              >
                Transfer Request
              </Button>
            }
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="assetId" label="Asset" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select an asset"
              optionFilterProp="label"
              options={assets.map((a) => ({
                value: a.id,
                label: `${a.assetTag} · ${a.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="holderId"
            label="Allocate to"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder="Select a person"
              optionFilterProp="label"
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Form.Item>
          <Form.Item name="expectedReturnDate" label="Expected Return Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={allocate.isPending}>
            Allocate
          </Button>
        </Form>
      </Card>

      <Card title="Current allocations">
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={allocations}
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </Space>
  );
}
