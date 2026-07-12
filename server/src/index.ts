import "dotenv/config";
import express from "express";
import cors from "cors";
import { ok } from "./lib/http.js";
import authRoutes from "./routes/auth.js";
import assetRoutes from "./routes/assets.js";
import departmentRoutes from "./routes/departments.js";
import categoryRoutes from "./routes/categories.js";
import userRoutes from "./routes/users.js";
import bookingRoutes from "./routes/bookings.js";
import maintenanceRoutes from "./routes/maintenance.js";
import allocationRoutes from "./routes/allocations.js";
import transferRoutes from "./routes/transfers.js";
import notificationRoutes from "./routes/notifications.js";
import activityLogRoutes from "./routes/activityLogs.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  ok(res, { ok: true, service: "assetflow-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/dashboard", dashboardRoutes);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
