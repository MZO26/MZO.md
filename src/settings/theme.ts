import { setTheme } from "@/api/api";
import { findElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { CODE_THEME_MAP, THEME_MAP } from "@shared/constants";
import type { CodeTheme, Theme } from "@shared/schemas/store-schema";
import type { ResolvedTheme, Result, ThemeResult } from "@shared/types";

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return THEME_MAP[theme];
}

async function applyAppTheme(preference: Theme): Promise<Result<ThemeResult>> {
  const codePreference = setCodeTheme(resolveTheme(preference));
  const focus = getAppItem("appContainer").matches(
    ".focus, .toolbar-collapsed",
  );
  const result = await setTheme(preference, focus);
  if (!result.success) {
    console.error("[applyAppTheme]: Failed to apply theme:", result.error);
    return { success: false, error: result.error };
  }
  document.documentElement.dataset["theme"] = result.data;
  return {
    success: true,
    data: { theme: preference, codeTheme: codePreference },
  };
}

function setCodeTheme(resolvedTheme: ResolvedTheme): CodeTheme {
  // needs its own lookup for dom element because its coupled to applyAppTheme
  const codeThemeSelect = findElement<HTMLSelectElement>("#code-theme");
  const preference = codeThemeSelect?.value as CodeTheme;
  const codeTheme =
    CODE_THEME_MAP[preference]?.[resolvedTheme] ??
    CODE_THEME_MAP["balanced"]?.[resolvedTheme];
  document.documentElement.dataset["codetheme"] = codeTheme;
  return preference;
}

export { applyAppTheme, resolveTheme, setCodeTheme };
