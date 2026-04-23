import type { AppFont } from "../../../shared/schemas/storeSchema";
import { showToast } from "../../utils/toast";

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

export { getSelectedFont, setSelectedFont };
