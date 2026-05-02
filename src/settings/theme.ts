import { setTheme } from "@/api/electronAPI";
import { getSettings, setSettings } from "@/api/settingsAPI";
import { getElement } from "@/utils/helpers";
import { showToast } from "@/utils/toast";
import type { CodeTheme, Theme } from "@shared/schemas/storeSchema";
import { CODE_THEME_MAP, THEME_MAP } from "@shared/themes.constants";
import type { Code, ResolvedTheme } from "@shared/types";

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return THEME_MAP[theme];
}

const applyAppTheme = async (
  selectElement: HTMLSelectElement,
  themeOverride?: Theme,
  onOSchange?: boolean,
) => {
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme");
  let theme: Theme;
  if (themeOverride) {
    theme = themeOverride; // theme override
  } else {
    // fallback reading from store
    const response = await getSettings("theme");
    theme = response.success ? response.data : "system";
  }
  const resolved = theme === "system" ? resolveTheme(theme) : theme;
  document.documentElement.setAttribute("data-theme", resolved); // set selected theme as background and fallback for system
  if (selectElement && !onOSchange) {
    selectElement.value = theme; // update select value to selected theme
    // api call for theme to resolve electrons internal theme
    const preference = setCodeTheme(codeThemeSelect);
    await setSettings({
      theme: theme,
      "code-theme": preference,
    });
  } else selectElement.value = "system"; // does not set theme because it was triggered by theme-changed callback and should not be overwritten
  await setTheme(theme);
};

function getDefaultCodeTheme(
  selectElement: HTMLSelectElement,
  resolvedTheme: ResolvedTheme,
): { preference: CodeTheme; codeTheme: Code } {
  const preference = selectElement.value as CodeTheme;
  selectElement.value = preference;
  return {
    preference,
    codeTheme:
      CODE_THEME_MAP[preference]?.[resolvedTheme] ??
      CODE_THEME_MAP["balanced"]?.[resolvedTheme],
  };
}

function setCodeTheme(selectElement: HTMLSelectElement): CodeTheme {
  const theme = document.documentElement.getAttribute("data-theme") as Theme;
  const resolvedTheme = resolveTheme(theme);
  const { preference, codeTheme } = getDefaultCodeTheme(
    selectElement,
    resolvedTheme,
  );
  document.documentElement.setAttribute("data-code-theme", codeTheme);
  return preference;
}

async function setAppTheme(event: Event) {
  const selectElement = event.currentTarget as HTMLSelectElement;
  const theme = selectElement.value;
  const validTheme = theme in THEME_MAP ? (theme as Theme) : "system";
  // sets the theme in the main process, which will trigger the theme-changed event
  await applyAppTheme(selectElement, validTheme, false);
  showToast(`Set app theme to: ${validTheme}`);
}

export { applyAppTheme, resolveTheme, setAppTheme, setCodeTheme };
