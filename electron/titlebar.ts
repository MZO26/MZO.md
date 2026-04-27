import { BrowserWindow, nativeTheme } from "electron";
import { StoreSchema, type AppTheme } from "../shared/schemas/storeSchema";
import type { NativeWindowColors } from "../shared/types";
import { THEME_DATA } from "../src/constants/themes";

// updates the title bar overlay accordingly
function getTitleBarOverlay(
  themeName: Exclude<AppTheme, "system">, // exclude for union types (|) and Omit for object types ({})
): NativeWindowColors {
  const theme = THEME_DATA[themeName];
  return {
    backgroundColor: theme.background,
    overlayOptions: {
      color: theme.color,
      symbolColor: theme.symbolColor,
      height: 30,
    },
  };
}

// tells electron if theme is dark or light
function initTheme(savedTheme: unknown): Exclude<AppTheme, "system"> {
  const validTheme = StoreSchema.shape.theme.safeParse(savedTheme);
  if (!validTheme.success) {
    console.warn(
      "[initTheme]: Invalid saved theme, falling back to system:",
      savedTheme,
    );
  }
  const theme = validTheme.success ? validTheme.data : "system";
  if (theme === "system") {
    nativeTheme.themeSource = "system";
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }
  nativeTheme.themeSource = THEME_DATA[theme].isDark ? "dark" : "light";
  return theme;
}

nativeTheme.on("updated", () => {
  if (nativeTheme.themeSource === "system") {
    const activeTheme = initTheme("system");
    const windowTheme = getTitleBarOverlay(activeTheme);
    BrowserWindow.getAllWindows().forEach((win) => {
      win.setTitleBarOverlay?.(windowTheme.overlayOptions);
    });
  }
});

export { getTitleBarOverlay, initTheme };
