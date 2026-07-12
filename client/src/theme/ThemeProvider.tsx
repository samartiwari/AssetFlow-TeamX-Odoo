import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { App as AntApp, ConfigProvider, theme as antdTheme } from "antd";
import { brand, feedback, type ThemeMode } from "./tokens";

type ThemeContextValue = {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "assetflow-theme";

// Read the saved preference; default to dark.
function initialMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  // Persist the choice and keep the page background in sync with the theme.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    document.body.style.background = brand[mode].colorBgLayout;
    document.body.style.color = brand[mode].colorText;
  }, [mode]);

  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  const themeConfig = useMemo(
    () => ({
      algorithm:
        mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        ...brand[mode],
        ...feedback[mode],
        borderRadius: 8,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      components: {
        // AntD's Layout Header/Sider default to a navy background that ignores the
        // algorithm; pin them to our surface tokens so both themes render correctly.
        Layout: {
          headerBg: brand[mode].colorBgContainer,
          siderBg: brand[mode].colorBgContainer,
          triggerBg: brand[mode].colorBgContainer,
          triggerColor: brand[mode].colorText,
          bodyBg: brand[mode].colorBgLayout,
        },
        Menu: {
          itemSelectedColor: brand[mode].colorPrimary,
          itemSelectedBg:
            mode === "dark"
              ? "rgba(159, 117, 255, 0.16)"
              : "rgba(124, 58, 237, 0.10)",
        },
      },
    }),
    [mode]
  );

  const value = useMemo(() => ({ mode, toggle, setMode }), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={themeConfig}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used inside ThemeProvider");
  }
  return ctx;
}
