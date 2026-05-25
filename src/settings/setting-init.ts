import { initSettingsDialog } from "@/settings/dialogs";
import { createSettingsMenu } from "@/settings/setting-builder";
import { buildSelects } from "@/settings/setting-items";
import { setSelectListeners } from "@/settings/setting-items-init";
import { applyAppTheme } from "@/settings/theme-actions";
import { findElement, requireElement, setActiveItem } from "@/utils/dom";
import { registerAppEvents } from "@/utils/registry";
import type { AppSettings } from "@shared/schemas/store-schema";

async function initAppSettings(settings: AppSettings) {
  const { settingsDialog, settingsContainer } = initSettingsDialog();
  settingsContainer.appendChild(createSettingsMenu());
  buildSelects();
  setSelectListeners(settings);
  const buttonsContainer = findElement<HTMLDivElement>(".settings-buttons");
  if (!buttonsContainer) return;
  const openModalBtn = requireElement<HTMLButtonElement>(".settings-btn");
  const firstActiveBtn = requireElement<HTMLButtonElement>(
    "button:first-child",
    buttonsContainer,
  );
  if (firstActiveBtn) setActiveItem(firstActiveBtn, buttonsContainer);
  await applyAppTheme(settings["theme"]);
  applyModalListeners(
    openModalBtn,
    buttonsContainer,
    settingsContainer,
    settingsDialog,
  );
  registerAppEvents(document, {
    "app:open-settings": () => settingsDialog.showModal(),
  });
}

function applyModalListeners(
  openModalBtn: HTMLButtonElement,
  buttonsContainer: HTMLDivElement,
  settingsContainer: HTMLDivElement,
  modal: HTMLDialogElement,
) {
  openModalBtn.addEventListener("click", () => {
    modal.showModal();
  });
  buttonsContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target === buttonsContainer) return;
    const btn = target.closest<HTMLButtonElement>(".selection-btn");
    if (!btn) return;
    const targetTab = btn.dataset["category"];
    if (!targetTab) return;
    settingsContainer.dataset["activetab"] = targetTab;
    setActiveItem(btn, buttonsContainer);
  });
}

export { initAppSettings };
