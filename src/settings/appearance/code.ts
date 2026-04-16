import { THEME_MAP } from "../../constants/themes";
import type { Code, Theme } from "../../shared/types";
import { resolveTheme } from "./theme";

const isTheme = (value: string): value is Theme =>
  value === "system" || Object.hasOwn(THEME_MAP, value);

async function setSelectedCodeTheme(event: Event) {
  try {
    const selectedTheme = event.target as HTMLSelectElement;
    const theme = selectedTheme.value;
    document.documentElement.setAttribute("data-code-theme", theme);
    await window.storeApi.setSettings("code-theme", theme);
    console.log("Selected code-theme:", theme);
  } catch (error) {
    console.error("Failed to set code-theme:", error);
    return;
  }
}

async function getSelectedCodeTheme(
  selectElement: HTMLSelectElement | undefined,
) {
  try {
    const response = await window.storeApi.getSettings("code-theme");

    if (!response.success) {
      const theme = document.documentElement.dataset["theme"];
      const resolvedTheme =
        theme && isTheme(theme) ? resolveTheme(theme) : resolveTheme("system");
      const codeTheme =
        resolvedTheme === "dark" ? "github-dark" : "github-light";
      document.documentElement.dataset["codeTheme"] = codeTheme;
      if (selectElement) selectElement.value = codeTheme;
      return codeTheme;
    }
    const codeTheme = response.data;
    document.documentElement.setAttribute("data-code-theme", codeTheme as Code);
    if (selectElement) {
      selectElement.value = codeTheme as Code;
    }
    return codeTheme;
  } catch (error) {
    console.error("Failed to load code-theme:", error);
  }
}

export { getSelectedCodeTheme, setSelectedCodeTheme };
