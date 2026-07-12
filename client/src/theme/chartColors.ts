import { brand, type ThemeMode } from "./tokens";

// Colors for Recharts, pulled from the theme tokens so charts match light/dark.
export function chartColors(mode: ThemeMode) {
  return {
    bar: brand[mode].colorPrimary,
    axis: brand[mode].colorTextSecondary,
    grid: brand[mode].colorBorder,
    surface: brand[mode].colorBgContainer,
    text: brand[mode].colorText,
  };
}
