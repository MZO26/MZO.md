import { updateSettings, setTheme } from "@/api/api";
import { getSettingsItem } from "@/utils/registry";
import { CODE_THEME_MAP, THEME_MAP } from "@shared/constants";
import type { CodeTheme, Theme } from "@shared/schemas/store-schema";
import type { ResolvedTheme } from "@shared/types";

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
  let themePreference: Theme = themeOverride || "system";
  if (!themeOverride) {
    // no override means only on startup
    if (themeRes) themePreference = themeRes;
  }
  const baseTheme = resolveTheme(themePreference);
  const domTheme = themePreference === "system" ? baseTheme : themePreference;
  document.documentElement.dataset["theme"] = domTheme;
  const codePreference = setCodeTheme(baseTheme);
  if (!onOSchange) {
    updateSettings({ theme: themePreference, "code-theme": codePreference });
  }
  await setTheme(domTheme);
}

function setCodeTheme(resolvedTheme: ResolvedTheme): CodeTheme {
  const codeThemeSelect = getSettingsItem("codeThemeSelect");
  const preference = codeThemeSelect?.value as CodeTheme;
  const codeTheme =
    CODE_THEME_MAP[preference]?.[resolvedTheme] ??
    CODE_THEME_MAP["balanced"]?.[resolvedTheme];
  document.documentElement.dataset["codetheme"] = codeTheme;
  return preference;
}

export { applyAppTheme, resolveTheme, setCodeTheme };
