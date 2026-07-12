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

type SignupValues = { name: string; email: string; password: string };

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: SignupValues) => {
    setLoading(true);
    try {
      await signup(values.name, values.email, values.password);
      message.success("Account created");
      navigate("/");
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      message.error(msg ?? "Sign up failed, please try again");
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
          <Avatar
            size={56}
            style={{
              marginBottom: 12,
              backgroundColor: "#7C3AED",
              fontWeight: 700,
            }}
          >
            AF
          </Avatar>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Create your account
          </Typography.Title>
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label="Full name"
            name="name"
            rules={[{ required: true, message: "Enter your name" }]}
          >
            <Input placeholder="Jane Doe" size="large" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Enter your email" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="name@company.com" size="large" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Enter a password" },
              { min: 6, message: "At least 6 characters" },
            ]}
          >
            <Input.Password placeholder="••••••••••" size="large" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
          >
            Create Account
          </Button>
        </Form>

        <Typography.Paragraph
          type="secondary"
          style={{ textAlign: "center", marginTop: 12, marginBottom: 0 }}
        >
          New accounts start as employees. Admin roles are assigned later.
        </Typography.Paragraph>

        <Divider plain>Already have an account?</Divider>
        <Link to="/login">
          <Button size="large" block>
            Back to Log in
          </Button>
        </Link>
      </Card>
    </div>
  );
}
