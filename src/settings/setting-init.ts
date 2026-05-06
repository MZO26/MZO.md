import { getAllSettings } from "@/api/settingsAPI";
import { createSettingsMenu } from "@/settings/setting-builder";
import { setSelectListeners } from "@/settings/setting-items-init";
import { applyAppTheme } from "@/settings/setting-theme";
import { findElement, requireElement, setActiveItem } from "@/utils/dom";
import { getItem, registerAppEvents } from "@/utils/registry";
import type { AppSettings } from "@shared/schemas/store-schema";
import { buildSelects } from "./select-items";

function setModalState(show: boolean): void {
  const appContainer = getItem("appContainer");
  const overlay = findElement<HTMLDivElement>(".overlay");
  const modal = findElement<HTMLDivElement>(".modal");
  overlay?.classList.toggle("show", show);
  modal?.classList.toggle("show", show);
  appContainer.inert = show;
}

async function initAppSettings(settings: AppSettings) {
  const modal = findElement<HTMLDivElement>(".modal");
  const settingsContainer = findElement<HTMLDivElement>(".settings-content");
  if (!modal || !settingsContainer) return;
  settingsContainer.appendChild(createSettingsMenu());
  buildSelects();
  setSelectListeners(settings);
  const buttonsContainer = findElement<HTMLDivElement>(".settings-buttons");
  if (!buttonsContainer) return;
  const openModalBtn = requireElement<HTMLButtonElement>(".settings-btn");
  const closeModalBtn = requireElement<HTMLButtonElement>(".closeModal-btn");
  const firstActiveBtn = requireElement<HTMLButtonElement>(
    "button:first-child",
    buttonsContainer,
  );
  if (firstActiveBtn) setActiveItem(firstActiveBtn, buttonsContainer);
  await applyAppTheme(undefined, false, settings.theme, settings["code-theme"]);
  closeModalBtn.addEventListener("click", () => setModalState(false));
  openModalBtn.addEventListener("click", () => setModalState(true));
  buttonsContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target === buttonsContainer) return;
    const btn = target.closest(".selection-btn") as HTMLButtonElement | null;
    if (!btn) return;
    const targetTab = btn.dataset["category"];
    if (!targetTab) return;
    settingsContainer.dataset["activetab"] = targetTab;
    setActiveItem(btn, buttonsContainer);
  });

  registerAppEvents(document, {
    "app:open-settings": () => setModalState(true),
    "app:escape": () => {
      if (modal.classList.contains("show")) {
        setModalState(false);
      }
    },
  });
}

async function loadSettings(): Promise<AppSettings> {
  const response = await getAllSettings();
  if (!response.success) {
    console.error(response.message);
    throw new Error(response.message);
  }
  return response.data;
}

export { initAppSettings, loadSettings };
