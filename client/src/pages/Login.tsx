import { Button, Card, Divider, Form, Input, Typography, Avatar } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Visual shell for the login screen. The real email/password flow is wired up
// once auth is in place; for now the button drops you into the app.
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const enterApp = () => {
    login({
      id: "u-001",
      name: "Aarav Sharma",
      email: "aarav@assetflow.local",
      role: "ADMIN",
    });
    navigate("/");
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
            AssetFlow
          </Typography.Title>
        </div>

        <Form layout="vertical" onFinish={enterApp}>
          <Form.Item label="Email" name="email">
            <Input placeholder="name@company.com" size="large" />
          </Form.Item>
          <Form.Item label="Password" name="password">
            <Input.Password placeholder="••••••••••" size="large" />
          </Form.Item>
          <div style={{ textAlign: "right", marginBottom: 12 }}>
            <Typography.Link>Forgot password</Typography.Link>
          </div>
          <Button type="primary" htmlType="submit" size="large" block>
            Log in
          </Button>
        </Form>

        <Divider plain>New here?</Divider>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center" }}>
          Sign up creates an employee account. Admin roles are assigned later.
        </Typography.Paragraph>
        <Button size="large" block>
          Create Account
        </Button>
      </Card>
    </div>
  );
}
