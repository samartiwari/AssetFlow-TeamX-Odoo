import { App, Form, Input, Modal, Select } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAssets } from "../api/assets";
import { raiseMaintenance } from "../api/maintenance";

type Props = { open: boolean; onClose: () => void };
type RaiseValues = { assetId: string; description: string; priority: string };

export default function RaiseMaintenanceModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<RaiseValues>();

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", "picker"],
    queryFn: () => fetchAssets(),
  });

  const mutation = useMutation({
    mutationFn: (values: RaiseValues) => raiseMaintenance(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      message.success("Maintenance request raised");
      form.resetFields();
      onClose();
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      message.error(msg ?? "Could not raise request");
    },
  });

  const close = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Raise Maintenance Request"
      onCancel={close}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText="Raise Request"
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => mutation.mutate(v)}
        initialValues={{ priority: "MEDIUM" }}
      >
        <Form.Item
          name="assetId"
          label="Asset"
          rules={[{ required: true, message: "Select an asset" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Select an asset"
            options={assets.map((a) => ({
              value: a.id,
              label: `${a.assetTag} — ${a.name}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="priority"
          label="Priority"
          rules={[{ required: true, message: "Select a priority" }]}
        >
          <Select
            options={[
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="description"
          label="Issue"
          rules={[{ required: true, message: "Describe the issue" }]}
        >
          <Input.TextArea rows={3} placeholder="Describe what's wrong…" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
