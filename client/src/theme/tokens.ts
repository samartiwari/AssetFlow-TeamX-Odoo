// Color tokens for the app. Screens read from here so light and dark stay in sync.

export type ThemeMode = "light" | "dark";

// Brand / core surface colors, fed into Ant Design's ConfigProvider tokens.
export const brand: Record<ThemeMode, Record<string, string>> = {
  light: {
    colorPrimary: "#7C3AED",
    colorPrimaryHover: "#6D28D9",
    colorBgLayout: "#F5F6F8",
    colorBgContainer: "#FFFFFF",
    colorBorder: "#E5E7EB",
    colorText: "#1F2430",
    colorTextSecondary: "#6B7280",
  },
  dark: {
    colorPrimary: "#9F75FF",
    colorPrimaryHover: "#B69AFF",
    colorBgLayout: "#141414",
    colorBgContainer: "#1E1E1E",
    colorBorder: "#303030",
    colorText: "#EDEDED",
    colorTextSecondary: "#A0A0A0",
  },
};

// Feedback tokens (success / warning / danger / info) also fed to ConfigProvider.
export const feedback: Record<ThemeMode, Record<string, string>> = {
  light: {
    colorSuccess: "#0CA30C",
    colorWarning: "#EDA100",
    colorError: "#D03B3B",
    colorInfo: "#256ABF",
  },
  dark: {
    colorSuccess: "#3DD35D",
    colorWarning: "#F5C044",
    colorError: "#F06565",
    colorInfo: "#4C93E8",
  },
};

// One lookup for every status a badge might render across the modules
// (asset lifecycle, maintenance, transfers, bookings, audit verdicts). Keys are
// normalized to UPPER_SNAKE so "Under Maintenance" and "UNDER_MAINTENANCE" match.
export const statusColors: Record<ThemeMode, Record<string, string>> = {
  light: {
    // asset lifecycle
    AVAILABLE: "#0CA30C",
    ALLOCATED: "#256ABF",
    RESERVED: "#7C3AED",
    UNDER_MAINTENANCE: "#EDA100",
    LOST: "#D03B3B",
    RETIRED: "#8A8A85",
    DISPOSED: "#52514E",
    // record status
    ACTIVE: "#0CA30C",
    INACTIVE: "#8A8A85",
    // maintenance workflow
    PENDING: "#EDA100",
    APPROVED: "#0CA30C",
    REJECTED: "#D03B3B",
    TECH_ASSIGNED: "#256ABF",
    IN_PROGRESS: "#256ABF",
    RESOLVED: "#0CA30C",
    // transfers
    REQUESTED: "#EDA100",
    REALLOCATED: "#0CA30C",
    // bookings
    UPCOMING: "#256ABF",
    ONGOING: "#256ABF",
    COMPLETED: "#0CA30C",
    CANCELLED: "#D03B3B",
    // audit verdicts
    VERIFIED: "#0CA30C",
    MISSING: "#D03B3B",
    DAMAGED: "#EB6834",
  },
  dark: {
    AVAILABLE: "#3DD35D",
    ALLOCATED: "#4C93E8",
    RESERVED: "#9F75FF",
    UNDER_MAINTENANCE: "#F5C044",
    LOST: "#F06565",
    RETIRED: "#9A9A94",
    DISPOSED: "#6E6E68",
    ACTIVE: "#3DD35D",
    INACTIVE: "#9A9A94",
    PENDING: "#F5C044",
    APPROVED: "#3DD35D",
    REJECTED: "#F06565",
    TECH_ASSIGNED: "#4C93E8",
    IN_PROGRESS: "#4C93E8",
    RESOLVED: "#3DD35D",
    REQUESTED: "#F5C044",
    REALLOCATED: "#3DD35D",
    UPCOMING: "#4C93E8",
    ONGOING: "#4C93E8",
    COMPLETED: "#3DD35D",
    CANCELLED: "#F06565",
    VERIFIED: "#3DD35D",
    MISSING: "#F06565",
    DAMAGED: "#F0895E",
  },
};

// Neutral fallback when a status isn't in the map.
export const neutralStatus: Record<ThemeMode, string> = {
  light: "#8A8A85",
  dark: "#9A9A94",
};

export function statusColor(status: string, mode: ThemeMode): string {
  const key = status.trim().toUpperCase().replace(/\s+/g, "_");
  return statusColors[mode][key] ?? neutralStatus[mode];
}
