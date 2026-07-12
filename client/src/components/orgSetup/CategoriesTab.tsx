import { useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  type TableColumnsType,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  fetchCategories,
  updateCategory,
  type Category,
} from "../../api/org";

type FieldPair = { key: string; value: string };
type CategoryFormValues = { name: string; fields?: FieldPair[] };

function errorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: string } } })?.response?.data
    ?.error;
}

export default function CategoriesTab() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm<CategoryFormValues>();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const saveMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const customFields = (values.fields ?? []).reduce<Record<string, unknown>>(
        (acc, f) => {
          if (f?.key) acc[f.key] = f.value;
          return acc;
        },
        {}
      );
      const payload = {
        name: values.name,
        customFields: Object.keys(customFields).length ? customFields : null,
      };
      return editing
        ? updateCategory(editing.id, payload)
        : createCategory(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      message.success(editing ? "Category updated" : "Category created");
      closeModal();
    },
    onError: (err) => message.error(errorMessage(err) ?? "Something went wrong"),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    const fields = c.customFields
      ? Object.entries(c.customFields).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [];
    form.setFieldsValue({ name: c.name, fields });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const columns: TableColumnsType<Category> = [
    { title: "Category", dataIndex: "name", key: "name" },
    {
      title: "Custom Fields",
      key: "fields",
      render: (_, c) =>
        c.customFields ? Object.keys(c.customFields).join(", ") : "—",
    },
    { title: "Assets", key: "assets", render: (_, c) => c._count?.assets ?? 0 },
    {
      title: "Actions",
      key: "actions",
      render: (_, c) => (
        <Button size="small" onClick={() => openEdit(c)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Button type="primary" onClick={openCreate}>
          + Add Category
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={categories}
        columns={columns}
        pagination={false}
      />

      <Modal
        open={open}
        title={editing ? "Edit Category" : "New Category"}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText={editing ? "Save" : "Create"}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => saveMutation.mutate(v)}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Enter a name" }]}
          >
            <Input placeholder="Electronics" />
          </Form.Item>

          <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.75 }}>
            Custom fields (optional)
          </div>
          <Form.List name="fields">
            {(fieldsList, { add, remove }) => (
              <>
                {fieldsList.map((field) => (
                  <Space
                    key={field.key}
                    align="baseline"
                    style={{ display: "flex", marginBottom: 8 }}
                  >
                    <Form.Item name={[field.name, "key"]} noStyle>
                      <Input placeholder="field (e.g. warrantyMonths)" />
                    </Form.Item>
                    <Form.Item name={[field.name, "value"]} noStyle>
                      <Input placeholder="value" />
                    </Form.Item>
                    <Button size="small" danger onClick={() => remove(field.name)}>
                      Remove
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block>
                  + Add field
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
