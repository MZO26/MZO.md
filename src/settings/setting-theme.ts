import { setTheme } from "@/api/electronAPI";
import { debouncedSetSettings } from "@/api/settingsAPI";
import { findElement } from "@/utils/dom";
import { showToast } from "@/utils/toast";
import type { CodeTheme, Theme } from "@shared/schemas/store-schema";
import { CODE_THEME_MAP, THEME_MAP } from "@shared/theme-constants";
import type { Code, ResolvedTheme } from "@shared/types";

let currentDomTheme: Theme | null = null;

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return THEME_MAP[theme];
}

const applyAppTheme = async (
  themeOverride?: Theme,
  onOSchange = false,
  themeRes?: Theme,
  codeRes?: CodeTheme,
) => {
  const themeSelect = findElement<HTMLSelectElement>("#theme");
  const codeThemeSelect = findElement<HTMLSelectElement>("#code-theme");
  let appPref: Theme = themeOverride || "system";
  if (!themeSelect || !codeThemeSelect) return;
  if (!themeOverride) {
    // no override means only on startup
    if (themeRes) appPref = themeRes;
    if (codeRes) codeThemeSelect.value = codeRes;
  }
  const baseTheme = resolveTheme(appPref);
  const domTheme = appPref === "system" ? baseTheme : appPref;
  document.documentElement.dataset["theme"] = domTheme;
  themeSelect.value = appPref;
  const codePref = setCodeTheme(baseTheme);
  if (!onOSchange) {
    debouncedSetSettings({ theme: appPref, "code-theme": codePref });
  }
  if (currentDomTheme !== domTheme) {
    currentDomTheme = domTheme;
    await setTheme(domTheme);
  }
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
  const codeThemeSelect = findElement<HTMLSelectElement>("#code-theme");
  const preference = codeThemeSelect?.value as CodeTheme;
  return {
    preference,
    codeTheme:
      CODE_THEME_MAP[preference]?.[resolvedTheme] ??
      CODE_THEME_MAP["balanced"]?.[resolvedTheme],
  };
}

async function setAppTheme() {
  const themeSelect = findElement<HTMLSelectElement>("#theme");
  if (!themeSelect) return;
  const themeValue = themeSelect.value;
  const validTheme = themeValue in THEME_MAP ? (themeValue as Theme) : "system";
  await applyAppTheme(validTheme, false);
  showToast(`Set app theme to: ${validTheme}`);
}

export { applyAppTheme, resolveTheme, setAppTheme, setCodeTheme };
