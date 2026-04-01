import type { Theme } from "../shared/types";
import { getValue, setValue } from "../store/storage";

const applyAppTheme = async (
  selectElement?: HTMLSelectElement,
  themeOverride?: Theme,
) => {
  try {
    const theme: Theme = themeOverride || getValue("theme") || "system";
    console.log("Applying theme:", theme);
    document.documentElement.setAttribute("data-theme", theme);
    if (selectElement) {
      selectElement.value = theme;
    }
    window.electronAPI.setTheme(theme);
    setValue<"theme">("theme", theme);
  } catch (error) {
    console.error("Failed to get system theme:", error);
    return;
  }
};

const setAppTheme = async (event: Event) => {
  // toggles between light and dark theme
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

export { applyAppTheme, setAppTheme };
