import { THEME_MAP } from "../../constants/themes";
import type { Theme } from "../../shared/types";
import { getElement } from "../../utils/helpers";
import { showToast } from "../../utils/toast";

type ResolvedTheme = "light" | "dark";

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return THEME_MAP[theme];
}

const applyAppTheme = async (
  selectElement?: HTMLSelectElement,
  themeOverride?: Theme,
) => {
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme-dropdown");
  try {
    let theme: Theme;
    if (themeOverride) {
      theme = themeOverride;
    } else {
      const result = await window.storeApi.getSettings("theme");
      if (!result.success) {
        theme = "system";
      } else theme = result.data;
    }
    const resolvedTheme = resolveTheme(theme);
    document.documentElement.dataset["theme"] = theme;
    if (selectElement) {
      selectElement.value = theme;
    }
    await window.storeApi.setSettings("theme", theme);
    const defaultCodeTheme =
      resolvedTheme === "dark" ? "github-dark" : "github-light";
    document.documentElement.setAttribute("data-code-theme", defaultCodeTheme);
    await window.storeApi.setSettings("code-theme", defaultCodeTheme);
    codeThemeSelect.value = "system";
    showToast(`Set new theme: ${theme}`);
  } catch (error) {
    console.error("Failed to get system theme:", error);
    return;
  }
};

const setAppTheme = async (event: Event) => {
  try {
    const selectElement = event.currentTarget as HTMLSelectElement;
    const newTheme: Theme = selectElement.value as Theme;
    // sets the theme in the main process, which will trigger the theme-changed event
    await applyAppTheme(selectElement, newTheme);
  } catch (error) {
    console.error("Failed to get current theme:", error);
    return;
  }
};

export { applyAppTheme, resolveTheme, setAppTheme };
