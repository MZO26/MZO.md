import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type { NativeWindowColors } from "@shared/shared-types";
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
    window.webContents.send(IPC_CHANNELS.THEME_CHANGED, resolvedTheme);
  }
}

const THEME_DATA: Record<
  Exclude<Theme, "system">,
  {
    color: string;
    symbolColor: string;
    background: string;
    isDark: boolean;
    focus: string;
  }
> = {
  light: {
    color: "#fcfcfc", // --bg-sidebar
    symbolColor: "#18181b", // --text-main
    background: "#fcfcfc", // --bg-sidebar
    isDark: false,
    focus: "#fcfcfc", // --bg-editor
  },
  dark: {
    color: "#1d1d20", // --bg-sidebar
    symbolColor: "#a1a1aa", // --text-muted
    background: "#1d1d20", // --bg-sidebar
    isDark: true,
    focus: "#1d1d20", // --bg-editor
  },
  light_warm: {
    color: "#f8f7f3", // --bg-sidebar
    symbolColor: "#5e5b56", // --text-muted
    background: "#f8f7f3", // --bg-editor
    isDark: false,
    focus: "#f8f7f3", // --bg-editor
  },
  dark_warm: {
    color: "#1e1b17", // --bg-sidebar
    symbolColor: "#9e9890", // --text-muted
    background: "#1e1b17", // --bg-sidebar
    isDark: true,
    focus: "#1e1b17", // --bg-editor
  },
} as const;

export { getTitleBarOverlay, initTheme, onOSThemeChange };
