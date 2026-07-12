import {
  App,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
} from "antd";
import type { Dayjs } from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAuditCycle } from "../api/audits";
import { fetchUsers } from "../api/org";
import { errorMessage } from "../lib/format";

type FormValues = {
  scope: string;
  range: [Dayjs, Dayjs];
  auditorIds: string[];
  location?: string;
};

export default function NewAuditCycleModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (cycleId: string) => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm<FormValues>();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      createAuditCycle({
        scope: values.scope,
        startDate: values.range[0].format("YYYY-MM-DD"),
        endDate: values.range[1].format("YYYY-MM-DD"),
        auditorIds: values.auditorIds,
        location: values.location?.trim() || undefined,
      }),
    onSuccess: (cycle) => {
      qc.invalidateQueries({ queryKey: ["auditCycles"] });
      message.success("Audit cycle created");
      form.resetFields();
      onCreated(cycle.id);
      onClose();
    },
    onError: (err) =>
      message.error(errorMessage(err, "Could not create audit cycle")),
  });

  return (
    <Modal
      title="New Audit Cycle"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Create Cycle"
      confirmLoading={create.isPending}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => create.mutate(values)}
      >
        <Form.Item
          label="Scope"
          name="scope"
          rules={[{ required: true, message: "Name the audit scope" }]}
        >
          <Input placeholder="e.g. Engineering dept - Q3" />
        </Form.Item>
        <Form.Item
          label="Date range"
          name="range"
          rules={[{ required: true, message: "Pick a date range" }]}
        >
          <DatePicker.RangePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="Auditors"
          name="auditorIds"
          rules={[{ required: true, message: "Assign at least one auditor" }]}
        >
          <Select
            mode="multiple"
            placeholder="Select auditors"
            optionFilterProp="label"
            options={users.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.role})`,
            }))}
          />
        </Form.Item>
        <Form.Item
          label="Location filter"
          name="location"
          tooltip="Optional. Limits the checklist to assets whose location matches. Leave blank to audit all active assets."
        >
          <Input placeholder="All active assets" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
