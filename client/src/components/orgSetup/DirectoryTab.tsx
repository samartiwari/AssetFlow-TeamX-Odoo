import { useState } from "react";
import {
  App,
  Button,
  Form,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  type TableColumnsType,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "../StatusBadge";
import {
  fetchUsers,
  updateUser,
  updateUserRole,
  type DirectoryUser,
} from "../../api/org";

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Employee",
  DEPT_HEAD: "Department Head",
  ASSET_MANAGER: "Asset Manager",
  ADMIN: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  EMPLOYEE: "default",
  DEPT_HEAD: "blue",
  ASSET_MANAGER: "purple",
  ADMIN: "gold",
};

function errorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: string } } })?.response?.data
    ?.error;
}

export default function DirectoryTab() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [roleTarget, setRoleTarget] = useState<DirectoryUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("EMPLOYEE");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      updateUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      message.success("Role updated");
      setRoleTarget(null);
    },
    onError: (err) => message.error(errorMessage(err) ?? "Could not update role"),
  });

  const statusMutation = useMutation({
    mutationFn: (u: DirectoryUser) =>
      updateUser(u.id, {
        status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      message.success("Status updated");
    },
    onError: (err) => message.error(errorMessage(err) ?? "Could not update"),
  });

  const openRole = (u: DirectoryUser) => {
    setSelectedRole(u.role);
    setRoleTarget(u);
  };

  const columns: TableColumnsType<DirectoryUser> = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Department",
      key: "dept",
      render: (_, u) => u.department?.name ?? "—",
    },
    {
      title: "Role",
      key: "role",
      render: (_, u) => (
        <Tag color={ROLE_COLORS[u.role] ?? "default"}>
          {ROLE_LABELS[u.role] ?? u.role}
        </Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, u) => <StatusBadge status={u.status} />,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, u) => (
        <Space>
          <Button size="small" onClick={() => openRole(u)}>
            Change Role
          </Button>
          <Button
            size="small"
            onClick={() => statusMutation.mutate(u)}
            loading={statusMutation.isPending}
          >
            {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={users}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        open={!!roleTarget}
        title={roleTarget ? `Change role — ${roleTarget.name}` : "Change role"}
        onCancel={() => setRoleTarget(null)}
        onOk={() =>
          roleTarget &&
          roleMutation.mutate({ id: roleTarget.id, role: selectedRole })
        }
        confirmLoading={roleMutation.isPending}
        okText="Save"
      >
        <Form layout="vertical">
          <Form.Item label="Role">
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
