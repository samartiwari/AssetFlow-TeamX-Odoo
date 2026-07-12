import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  App,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { createAsset } from "../api/assets";
import { fetchCategories } from "../api/org";
import { errorMessage } from "../lib/format";

type FormValues = {
  name: string;
  categoryId: string;
  serialNumber: string;
  acquisitionDate: Dayjs;
  cost: number;
  condition: string;
  location: string;
  isBookable: boolean;
};

export default function RegisterAssetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const mutation = useMutation({
    mutationFn: createAsset,
    onSuccess: (asset) => {
      message.success(`Registered ${asset.assetTag}`);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      form.resetFields();
      onClose();
    },
    onError: (err) =>
      message.error(errorMessage(err, "Could not register the asset")),
  });

  function handleOk() {
    form.validateFields().then((values) => {
      mutation.mutate({
        name: values.name,
        categoryId: values.categoryId,
        serialNumber: values.serialNumber,
        acquisitionDate: values.acquisitionDate.toISOString(),
        cost: values.cost,
        condition: values.condition,
        location: values.location,
        isBookable: values.isBookable ?? false,
      });
    });
  }

  return (
    <Modal
      title="Register Asset"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={mutation.isPending}
      okText="Register"
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ acquisitionDate: dayjs(), isBookable: false }}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Dell Latitude 7420" />
        </Form.Item>
        <Form.Item
          name="categoryId"
          label="Category"
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Select a category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item
          name="serialNumber"
          label="Serial Number"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="acquisitionDate"
          label="Acquisition Date"
          rules={[{ required: true }]}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="cost" label="Cost" rules={[{ required: true }]}>
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            prefix="₹"
          />
        </Form.Item>
        <Form.Item
          name="condition"
          label="Condition"
          rules={[{ required: true }]}
        >
          <Select
            options={["Excellent", "Good", "Fair", "Poor"].map((c) => ({
              value: c,
              label: c,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="location"
          label="Location"
          rules={[{ required: true }]}
        >
          <Input placeholder="e.g. HQ Floor 1" />
        </Form.Item>
        <Form.Item name="isBookable" label="Bookable resource" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
