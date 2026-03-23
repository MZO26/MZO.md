import { renderIcons } from "./icons";

const applyAppTheme = async (
  button?: HTMLButtonElement,
  themeOverride?: Theme,
) => {
  try {
    const theme: Theme = themeOverride || (await window.electronAPI.getTheme());
    console.log("Applying theme:", theme);
    document.documentElement.setAttribute("data-theme", theme);
    const SUN_ICON = `<i data-lucide="sun"></i>`;
    const MOON_ICON = `<i data-lucide="moon"></i>`;
    if (button) {
      if (theme === "dark") {
        // if the theme is dark, show the moon icon, otherwise show the sun icon
        button.innerHTML = MOON_ICON;
      } else {
        button.innerHTML = SUN_ICON;
      }
    }
    renderIcons(); // re-render icons to apply the new theme styles
    window.electronAPI.setTheme(theme);
  } catch (error) {
    console.error("Failed to get system theme:", error);
    return;
  }
};

const setAppTheme = async (button: HTMLButtonElement) => {
  // toggles between light and dark theme
  try {
    const currentTheme = await window.electronAPI.getTheme();
    const newTheme: Theme = currentTheme === "light" ? "dark" : "light";
    await window.electronAPI.setTheme(newTheme);
    // sets the theme in the main process, which will trigger the theme-changed event
    await applyAppTheme(button, newTheme);
  } catch (error) {
    console.error("Failed to get current theme:", error);
    return;
  }
};

export { applyAppTheme, setAppTheme };
