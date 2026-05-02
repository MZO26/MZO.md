import { setTheme } from "@/api/electronAPI";
import { getSettings, setSettings } from "@/api/settingsAPI";
import { getElement } from "@/utils/helpers";
import { showToast } from "@/utils/toast";
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

const applyAppTheme = async (themeOverride?: Theme, onOSchange = false) => {
  const themeSelect = getElement<HTMLSelectElement>("#theme");
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme");
  let appPref: Theme = themeOverride || "system";
  if (!themeOverride) {
    // no override means only on startup
    const appRes = await getSettings("theme");
    if (appRes.success) appPref = appRes.data;
    const codeRes = await getSettings("code-theme");
    if (codeRes.success) codeThemeSelect.value = codeRes.data;
  }
  const baseTheme = resolveTheme(appPref);
  const domTheme = appPref === "system" ? baseTheme : appPref;
  document.documentElement.dataset["theme"] = domTheme;
  themeSelect.value = appPref;
  const codePref = setCodeTheme(baseTheme);
  if (!onOSchange) {
    await setSettings({ theme: appPref, "code-theme": codePref });
  }
  await setTheme(domTheme);
};

function setCodeTheme(resolvedTheme: ResolvedTheme): CodeTheme {
  const { preference, codeTheme } = getDefaultCodeTheme(resolvedTheme);
  document.documentElement.dataset["codetheme"] = codeTheme;
  return preference;
}

function getDefaultCodeTheme(resolvedTheme: ResolvedTheme): {
  preference: CodeTheme;
  codeTheme: Code;
} {
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme");
  const preference = codeThemeSelect.value as CodeTheme;
  return {
    preference,
    codeTheme:
      CODE_THEME_MAP[preference]?.[resolvedTheme] ??
      CODE_THEME_MAP["balanced"]?.[resolvedTheme],
  };
}

async function setAppTheme() {
  const themeSelect = getElement<HTMLSelectElement>("#theme");
  const themeValue = themeSelect.value;
  const validTheme = themeValue in THEME_MAP ? (themeValue as Theme) : "system";
  await applyAppTheme(validTheme, false);
  showToast(`Set app theme to: ${validTheme}`);
}

export { applyAppTheme, resolveTheme, setAppTheme, setCodeTheme };
