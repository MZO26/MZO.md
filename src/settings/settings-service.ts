import {
  type AppFont,
  type AppTheme,
  type CodeThemePreference,
} from "../../shared/schemas/storeSchema";
import type { Code, ResolvedTheme } from "../../shared/types";
import { CODE_THEME_MAP, THEME_MAP } from "../constants/themes";
import { getElement } from "../utils/helpers";
import { showToast } from "../utils/toast";

async function setSelectedFont(event: Event) {
  const selectedFont = event.target as HTMLSelectElement;
  const font = selectedFont.value as AppFont;
  document.documentElement.setAttribute("data-font", font);
  const response = await window.storeApi.setSettings({ font: font });
  response.success
    ? showToast(`Selected font: ${font}`)
    : showToast("Failed to set font");
}

async function getSelectedFont(selectElement: HTMLSelectElement | undefined) {
  const response = await window.storeApi.getSettings("font");
  if (!response.success) return;
  const font: AppFont = response.data || "system";
  document.documentElement.setAttribute("data-font", font);
  if (selectElement) {
    selectElement.value = font;
  }
}

function resolveTheme(theme: AppTheme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return THEME_MAP[theme];
}

const applyAppTheme = async (
  selectElement: HTMLSelectElement,
  themeOverride?: AppTheme,
  onOSchange?: boolean,
) => {
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme-dropdown");
  let theme: AppTheme;
  if (themeOverride) {
    theme = themeOverride; // theme override
  } else {
    // fallback reading from store
    const response = await window.storeApi.getSettings("theme");
    theme = response.success ? response.data : "system";
  }
  const resolved = theme === "system" ? resolveTheme(theme) : theme;
  document.documentElement.setAttribute("data-theme", resolved); // set selected theme as background and fallback for system
  if (selectElement && !onOSchange) {
    selectElement.value = theme; // update select value to selected theme
    // api call for theme to resolve electrons internal theme
    const preference = setCodeTheme(codeThemeSelect);
    await window.storeApi.setSettings({
      theme: theme,
      "code-theme": preference,
    });
  } else selectElement.value = "system"; // does not set theme because it was triggered by theme-changed callback and should not be overwritten
  await window.electronAPI.setTheme(theme);
};

function getDefaultCodeTheme(
  selectElement: HTMLSelectElement,
  resolvedTheme: ResolvedTheme,
): { preference: CodeThemePreference; codeTheme: Code } {
  const preference = selectElement.value as CodeThemePreference;
  selectElement.value = preference;
  return {
    preference,
    codeTheme:
      CODE_THEME_MAP[preference]?.[resolvedTheme] ??
      CODE_THEME_MAP["balanced"]?.[resolvedTheme],
  };
}

function setCodeTheme(selectElement: HTMLSelectElement): CodeThemePreference {
  const theme = document.documentElement.getAttribute("data-theme") as AppTheme;
  const resolvedTheme = resolveTheme(theme);
  const { preference, codeTheme } = getDefaultCodeTheme(
    selectElement,
    resolvedTheme,
  );
  document.documentElement.setAttribute("data-code-theme", codeTheme);
  return preference;
}

const setAppTheme = async (event: Event) => {
  const selectElement = event.currentTarget as HTMLSelectElement;
  const theme = selectElement.value;
  const validTheme = theme in THEME_MAP ? (theme as AppTheme) : "system";
  // sets the theme in the main process, which will trigger the theme-changed event
  await applyAppTheme(selectElement, validTheme, false);
  showToast(`Set app theme to: ${validTheme}`);
};

export {
  applyAppTheme,
  getSelectedFont,
  resolveTheme,
  setAppTheme,
  setCodeTheme,
  setSelectedFont,
};
