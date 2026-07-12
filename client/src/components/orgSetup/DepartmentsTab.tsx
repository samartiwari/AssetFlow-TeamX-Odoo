import { useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  type TableColumnsType,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "../StatusBadge";
import {
  createDepartment,
  fetchDepartments,
  fetchUsers,
  updateDepartment,
  type Department,
} from "../../api/org";

type DeptFormValues = {
  name: string;
  headId?: string;
  parentId?: string;
  status: string;
};

function errorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: string } } })?.response?.data
    ?.error;
}

export default function DepartmentsTab() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form] = Form.useForm<DeptFormValues>();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const saveMutation = useMutation({
    mutationFn: (values: DeptFormValues) => {
      const payload = {
        name: values.name,
        headId: values.headId ?? null,
        parentId: values.parentId ?? null,
        status: values.status,
      };
      return editing
        ? updateDepartment(editing.id, payload)
        : createDepartment(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      message.success(editing ? "Department updated" : "Department created");
      closeModal();
    },
    onError: (err) => message.error(errorMessage(err) ?? "Something went wrong"),
  });

  const statusMutation = useMutation({
    mutationFn: (dept: Department) =>
      updateDepartment(dept.id, {
        status: dept.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      message.success("Status updated");
    },
    onError: (err) => message.error(errorMessage(err) ?? "Could not update"),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: "ACTIVE" });
    setOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    form.setFieldsValue({
      name: dept.name,
      headId: dept.headId ?? undefined,
      parentId: dept.parentId ?? undefined,
      status: dept.status,
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const columns: TableColumnsType<Department> = [
    { title: "Department", dataIndex: "name", key: "name" },
    { title: "Head", key: "head", render: (_, d) => d.head?.name ?? "—" },
    {
      title: "Parent Dept",
      key: "parent",
      render: (_, d) => d.parent?.name ?? "—",
    },
    {
      title: "Status",
      key: "status",
      render: (_, d) => <StatusBadge status={d.status} />,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, d) => (
        <Space>
          <Button size="small" onClick={() => openEdit(d)}>
            Edit
          </Button>
          <Button
            size="small"
            onClick={() => statusMutation.mutate(d)}
            loading={statusMutation.isPending}
          >
            {d.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Button type="primary" onClick={openCreate}>
          + Add Department
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={departments}
        columns={columns}
        pagination={false}
      />

      <Modal
        open={open}
        title={editing ? "Edit Department" : "New Department"}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText={editing ? "Save" : "Create"}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Enter a name" }]}
          >
            <Input placeholder="Engineering" />
          </Form.Item>
          <Form.Item name="headId" label="Department Head">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Select a head"
              options={users.map((u) => ({
                value: u.id,
                label: `${u.name} (${u.role})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="parentId" label="Parent Department">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Select a parent"
              options={departments
                .filter((d) => d.id !== editing?.id)
                .map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
