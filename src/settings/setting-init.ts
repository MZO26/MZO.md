import { openAppPath } from "@/api/api";
import { initSettingsDialog } from "@/settings/dialog-init";
import { createSettingsMenu } from "@/settings/setting-factory";
import { buildSelects } from "@/settings/setting-items";
import { setSelectListeners } from "@/settings/setting-items-init";
import { applyAppTheme } from "@/settings/theme";
import { createAsyncHandler } from "@/utils/async";
import { requireElement, setActiveItem } from "@/utils/dom";
import { registerAppEvents } from "@/utils/registry";
import type { AppSettings } from "@shared/schemas/store-schema";

async function initAppSettings(settings: AppSettings) {
  const { settingsDialog, settingsContainer } = initSettingsDialog();
  const buttonsContainer = createSettingsMenu();
  settingsContainer.appendChild(buttonsContainer);
  buildSelects();
  setSelectListeners(settings, settingsContainer);
  const openModalBtn = requireElement<HTMLButtonElement>(".settings-btn");
  const openPathBtn = requireElement<HTMLButtonElement>(".open-app-path-btn");
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
    openPathBtn,
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
  openPathBtn: HTMLButtonElement,
) {
  openModalBtn.addEventListener("click", () => {
    modal.showModal();
  });
  openPathBtn.addEventListener(
    "click",
    createAsyncHandler(async () => {
      await openAppPath();
    }),
  );
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
