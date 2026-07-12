import { Navigate, Route, Routes } from "react-router-dom";
import { type ReactNode } from "react";
import { Spin } from "antd";
import AppLayout from "./components/AppLayout";
import { useAuth, type Role } from "./auth/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import OrganizationSetup from "./pages/OrganizationSetup";
import Assets from "./pages/Assets";
import AllocationTransfer from "./pages/AllocationTransfer";
import ResourceBooking from "./pages/ResourceBooking";
import Maintenance from "./pages/Maintenance";
import Audit from "./pages/Audit";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";

// Redirect to login when there's no signed-in user.
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  // Wait for the session check to finish before deciding, so a refresh with a
  // valid token doesn't flash the login screen.
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Redirect away when the user's role isn't allowed on a screen.
function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return roles.includes(user.role) ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/organization"
          element={
            <RequireRole roles={["ADMIN"]}>
              <OrganizationSetup />
            </RequireRole>
          }
        />
        <Route path="/assets" element={<Assets />} />
        <Route path="/allocation" element={<AllocationTransfer />} />
        <Route path="/booking" element={<ResourceBooking />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
