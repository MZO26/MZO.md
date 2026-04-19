import { nativeTheme } from "electron";
import { THEME_DATA } from "../src/constants/themes";
import type { Theme, TitleBarOverlayOptions } from "../src/shared/types";

// updates the title bar overlay accordingly
function getTitleBarOverlay(
  themeName: Exclude<Theme, "system">, // exclude for union types (|) and Omit for object types ({})
): TitleBarOverlayOptions {
  const theme = THEME_DATA[themeName];
  return {
    color: theme.color,
    symbolColor: theme.symbolColor,
    height: 30,
  };
}

// tells electron if theme is dark or light
function initTheme(savedTheme: unknown): Exclude<Theme, "system"> {
  const theme = (savedTheme as Theme) ?? "system";
  if (theme === "system") {
    nativeTheme.themeSource = "system";
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }
  nativeTheme.themeSource = THEME_DATA[theme].isDark ? "dark" : "light";
  return theme;
}
export { getTitleBarOverlay, initTheme };
