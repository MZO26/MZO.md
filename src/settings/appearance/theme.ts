import { CODE_THEME_MAP, THEME_MAP } from "../../constants/themes";
import type {
  AppTheme,
  CodeThemePreference,
} from "../../shared/schemas/storeSchema";
import type { Code, ResolvedTheme } from "../../shared/types";
import { getElement } from "../../utils/helpers";
import { showToast } from "../../utils/toast";

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
  theme === "system" ? resolveTheme(theme) : theme;
  document.documentElement.setAttribute("data-theme", theme); // set selected theme as background and fallback for system
  if (selectElement) {
    selectElement.value = theme; // update select value to selected theme
  }
  const preference = setCodeTheme(codeThemeSelect);
  await window.electronAPI.setTheme(theme); // api call for theme to resolve electrons internal theme
  await window.storeApi.setSettings({ theme: theme, "code-theme": preference });
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
  const newTheme = selectElement.value as AppTheme;
  // sets the theme in the main process, which will trigger the theme-changed event
  try {
    await applyAppTheme(selectElement, newTheme);
    showToast(`Set app theme to: ${newTheme}`);
  } catch (error) {
    showToast("Unable to set app theme");
  }
};

export { applyAppTheme, resolveTheme, setAppTheme, setCodeTheme };
