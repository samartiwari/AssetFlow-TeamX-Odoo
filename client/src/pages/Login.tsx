import { useState } from "react";
import {
  App,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Typography,
  Avatar,
} from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type LoginValues = { email: string; password: string };

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginValues) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate("/");
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      message.error(msg ?? "Login failed, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card style={{ width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Avatar size={56} style={{ marginBottom: 12 }}>
            AF
          </Avatar>
          <Typography.Title level={4} style={{ margin: 0 }}>
            AssetFlow
          </Typography.Title>
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Enter your email" }]}
          >
            <Input placeholder="name@company.com" size="large" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Enter your password" }]}
          >
            <Input.Password placeholder="••••••••••" size="large" />
          </Form.Item>
          <div style={{ textAlign: "right", marginBottom: 12 }}>
            <Typography.Link>Forgot password</Typography.Link>
          </div>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
          >
            Log in
          </Button>
        </Form>

        <Divider plain>New here?</Divider>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center" }}>
          Sign up creates an employee account. Admin roles are assigned later.
        </Typography.Paragraph>
        <Link to="/signup">
          <Button size="large" block>
            Create Account
          </Button>
        </Link>
      </Card>
    </div>
  );
}
