import type { Theme } from "../../shared/types";

const applyAppTheme = async (
  selectElement?: HTMLSelectElement,
  themeOverride?: Theme,
) => {
  try {
    const theme: Theme =
      themeOverride ||
      (await window.storeApi.getSettings<Theme>("theme")).data ||
      "system";

    document.documentElement.setAttribute("data-theme", theme);
    if (selectElement) {
      selectElement.value = theme;
    }
    window.storeApi.setSettings("theme", theme);
    console.log("Set new theme: ", theme);
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

export { applyAppTheme, setAppTheme };
