import { THEME_DATA } from "@shared/constants/main-constants";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type { NativeWindowColors } from "@shared/types";
import { BrowserWindow, nativeTheme } from "electron";

// updates the title bar overlay accordingly
function getTitleBarOverlay(
  themeName: Exclude<Theme, "system">, // exclude for union types (|) and Omit for object types ({})
  focus?: boolean,
): NativeWindowColors {
  const theme = THEME_DATA[themeName];
  return {
    backgroundColor: theme.background,
    overlayOptions: {
      color: focus ? theme.focus : theme.color,
      symbolColor: theme.symbolColor,
      height: 30,
    },
  };
}

// tells electron if theme is dark or light
function initTheme(validTheme: Theme): Exclude<Theme, "system"> {
  if (validTheme === "system") {
    nativeTheme.themeSource = "system";
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }
  nativeTheme.themeSource = THEME_DATA[validTheme]?.isDark ? "dark" : "light";
  return validTheme;
}

function onOSThemeChange(win: BrowserWindow, store: AppSettings["theme"]) {
  if (!win || win.isDestroyed() || store !== "system") return; // only update theme if user has selected system theme
  const resolvedTheme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
  const newWindowTheme = getTitleBarOverlay(resolvedTheme);
  for (const window of BrowserWindow.getAllWindows()) {
    window.setBackgroundColor(newWindowTheme.backgroundColor);
    window.setTitleBarOverlay(newWindowTheme.overlayOptions);
    window.webContents.send("theme-changed", resolvedTheme);
  }
}

export { getTitleBarOverlay, initTheme, onOSThemeChange };
