import { useState } from "react";
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Grid } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useThemeMode } from "../theme/ThemeProvider";
import { useAuth, type Role } from "../auth/AuthContext";

const { Header, Sider, Content } = Layout;

type NavItem = {
  key: string;
  label: string;
  roles?: Role[]; // when set, only these roles see the item
};

// Order mirrors the product's left-hand navigation.
const NAV: NavItem[] = [
  { key: "/", label: "Dashboard" },
  { key: "/organization", label: "Organization Setup", roles: ["ADMIN"] },
  { key: "/assets", label: "Assets" },
  { key: "/allocation", label: "Allocation & Transfer" },
  { key: "/booking", label: "Resource Booking" },
  { key: "/maintenance", label: "Maintenance" },
  { key: "/audit", label: "Audit" },
  { key: "/reports", label: "Reports" },
  { key: "/notifications", label: "Notifications" },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { mode, toggle } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const visibleNav = NAV.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const selectedKey =
    visibleNav.find(
      (item) =>
        item.key === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(item.key)
    )?.key ?? "/";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={screens.xs ? 0 : 80}
        width={230}
      >
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: collapsed ? 16 : 20,
            letterSpacing: 0.5,
          }}
        >
          {collapsed ? "AF" : "AssetFlow"}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key)}
          items={visibleNav.map((item) => ({
            key: item.key,
            label: item.label,
          }))}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            paddingInline: 20,
          }}
        >
          <Button
            type="text"
            onClick={toggle}
            aria-label="Toggle theme"
            title={mode === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {mode === "dark" ? "☀️" : "🌙"}
          </Button>

          <Dropdown
            menu={{
              items: [
                {
                  key: "role",
                  label: (
                    <Typography.Text type="secondary">
                      {user?.role}
                    </Typography.Text>
                  ),
                  disabled: true,
                },
                { type: "divider" },
                { key: "logout", label: "Log out", onClick: () => logout() },
              ],
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Avatar size="small">
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </Avatar>
              {!screens.xs && (
                <Typography.Text>{user?.name ?? "Guest"}</Typography.Text>
              )}
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 20 }}>
          <div
            style={{
              padding: 24,
              minHeight: "calc(100vh - 96px)",
              borderRadius: 12,
              background: "var(--af-surface, transparent)",
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
