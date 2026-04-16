import type { Font } from "../../shared/types";

async function setSelectedFont(event: Event) {
  try {
    const selectedFont = event.target as HTMLSelectElement;
    const font = selectedFont.value;
    document.documentElement.setAttribute("data-font", font);
    await window.storeApi.setSettings("font", font);
    console.log("Selected font:", font);
  } catch (error) {
    console.error("Failed to set font:", error);
    return;
  }
}

async function getSelectedFont(selectElement: HTMLSelectElement | undefined) {
  try {
    let font;
    const response = await window.storeApi.getSettings("font");
    if (!response.success) return;
    font = response.data;
    document.documentElement.setAttribute("data-font", font as Font);
    if (selectElement) {
      selectElement.value = font as Font;
    }
  } catch (error) {
    console.error("Failed to load font:", error);
  }
}

export { getSelectedFont, setSelectedFont };
