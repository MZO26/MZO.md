import { nativeTheme } from "electron";
import type { AppTheme } from "../shared/schemas/storeSchema";
import type { TitleBarOverlayOptions } from "../shared/types";
import { THEME_DATA } from "../src/constants/themes";

// updates the title bar overlay accordingly
function getTitleBarOverlay(
  themeName: Exclude<AppTheme, "system">, // exclude for union types (|) and Omit for object types ({})
): TitleBarOverlayOptions {
  const theme = THEME_DATA[themeName];
  return {
    color: theme.color,
    symbolColor: theme.symbolColor,
    height: 30,
  };
}

// tells electron if theme is dark or light
function initTheme(savedTheme: unknown): Exclude<AppTheme, "system"> {
  const theme = (savedTheme as AppTheme) ?? "system";
  if (theme === "system") {
    nativeTheme.themeSource = "system";
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }
  nativeTheme.themeSource = THEME_DATA[theme].isDark ? "dark" : "light";
  return theme;
}
export { getTitleBarOverlay, initTheme };
