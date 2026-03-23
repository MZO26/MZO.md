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

const toggleAppTheme = async (button: HTMLButtonElement) => {
  // toggles between light and dark theme
  try {
    const newTheme = await window.electronAPI.toggleTheme();
    await applyAppTheme(button, newTheme);
  } catch (error) {
    console.error("Failed to get current theme:", error);
    return;
  }
};

export { applyAppTheme, toggleAppTheme };
