import { useState } from "react";
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Typography,
  Grid,
  Drawer,
  Badge,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useThemeMode } from "../theme/ThemeProvider";
import { brand } from "../theme/tokens";
import { useAuth, type Role } from "../auth/AuthContext";
import { fetchNotifications } from "../api/notifications";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { mode, toggle } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Poll the unread count so the bell badge stays roughly current.
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unread = notifData?.unread ?? 0;
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const isMobile = !screens.lg;

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

  const logo = (small: boolean) => (
    <div
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: small ? "center" : "flex-start",
        paddingInline: small ? 0 : 20,
        fontWeight: 700,
        fontSize: small ? 16 : 20,
        letterSpacing: 0.5,
        color: brand[mode].colorPrimary,
      }}
    >
      {small ? "AF" : "AssetFlow"}
    </div>
  );

  const navMenu = (
    <Menu
      mode="inline"
      style={{ borderInlineEnd: "none", background: "transparent" }}
      selectedKeys={[selectedKey]}
      onClick={({ key }) => {
        navigate(key);
        setDrawerOpen(false);
      }}
      items={visibleNav.map((item) => ({
        key: item.key,
        label: item.label,
      }))}
    />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
        <Sider
          theme={mode}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={230}
          style={{
            borderInlineEnd: `1px solid ${brand[mode].colorBorder}`,
          }}
        >
          {logo(collapsed)}
          {navMenu}
        </Sider>
      )}

      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={230}
        closable={false}
        styles={{ body: { padding: 0 }, header: { display: "none" } }}
      >
        {logo(false)}
        {navMenu}
      </Drawer>

      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingInline: 20,
            borderBottom: `1px solid ${brand[mode].colorBorder}`,
          }}
        >
          {isMobile ? (
            <Button
              type="text"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              style={{ fontSize: 18 }}
            >
              ☰
            </Button>
          ) : (
            <span />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Badge count={unread} size="small" offset={[-2, 4]}>
            <Button
              type="text"
              onClick={() => navigate("/notifications")}
              aria-label="Notifications"
              title="Notifications"
            >
              🔔
            </Button>
          </Badge>

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
          </div>
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
