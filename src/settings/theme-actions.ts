import { setTheme } from "@/api/electronAPI";
import { updateSettings } from "@/api/settingsAPI";
import { getSettingsItem } from "@/utils/registry";
import { CODE_THEME_MAP, THEME_MAP } from "@shared/constants";
import type { CodeTheme, Theme } from "@shared/schemas/store-schema";
import type { Code, ResolvedTheme } from "@shared/types";

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return THEME_MAP[theme];
}

async function applyAppTheme(
  themeOverride?: Theme,
  onOSchange = false,
  themeRes?: Theme,
) {
  let appPref: Theme = themeOverride || "system";
  if (!themeOverride) {
    // no override means only on startup
    if (themeRes) appPref = themeRes;
  }
  const baseTheme = resolveTheme(appPref);
  const domTheme = appPref === "system" ? baseTheme : appPref;
  document.documentElement.dataset["theme"] = domTheme;
  const codePref = setCodeTheme(baseTheme);
  if (!onOSchange) {
    updateSettings({ theme: appPref, "code-theme": codePref });
  }
  await setTheme(domTheme);
}

function setCodeTheme(resolvedTheme: ResolvedTheme): CodeTheme {
  const { preference, codeTheme } = getDefaultCodeTheme(resolvedTheme);
  document.documentElement.dataset["codetheme"] = codeTheme;
  return preference;
}

function getDefaultCodeTheme(resolvedTheme: ResolvedTheme): {
  preference: CodeTheme;
  codeTheme: Code;
} {
  const codeThemeSelect = getSettingsItem("codeThemeSelect");
  const preference = codeThemeSelect?.value as CodeTheme;
  return {
    preference,
    codeTheme:
      CODE_THEME_MAP[preference]?.[resolvedTheme] ??
      CODE_THEME_MAP["balanced"]?.[resolvedTheme],
  };
}

export { applyAppTheme, resolveTheme, setCodeTheme };
