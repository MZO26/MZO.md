import { rendererLogger } from "@/app";
import { settingsContainer, settingsDialog } from "@/settings/dialog-init";
import { getQuickAction } from "@/settings/quick-actions";
import {
  buildSelects,
  createQuickActionContainer,
  createSettingsMenu,
} from "@/settings/setting-factory";
import { setSelectListeners } from "@/settings/setting-items-init";
import { applyAppTheme } from "@/settings/theme-actions";
import { createAsyncHandler } from "@/utils/async";
import { requireElement, setActiveItem } from "@/utils/dom";
import { registerAppEvents } from "@/utils/registry";
import { QUICK_ACTIONS } from "@shared/constants/renderer-constants";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { QuickAction } from "@shared/types";

async function initAppSettings(settings: AppSettings) {
  const buttonsContainer = createSettingsMenu();
  settingsContainer.appendChild(buttonsContainer);
  buildSelects();
  setSelectListeners(settings, settingsContainer);
  const openModalBtn = requireElement<HTMLButtonElement>(".settings-btn");
  const firstActiveBtn = requireElement<HTMLButtonElement>(
    "button:first-child",
    buttonsContainer,
  );
  const quickActionContainer = createQuickActionContainer();
  if (firstActiveBtn) setActiveItem(firstActiveBtn, buttonsContainer);
  await applyAppTheme(settings["theme"]);
  applyModalListeners(
    openModalBtn,
    buttonsContainer,
    settingsContainer,
    settingsDialog,
    quickActionContainer,
  );
  registerAppEvents(document, {
    "app:open-settings": () => settingsDialog.showModal(),
  });
}

function isValidQuickAction(action: string): action is QuickAction {
  return QUICK_ACTIONS.some((a) => a.id === action);
}

function applyModalListeners(
  openModalBtn: HTMLButtonElement,
  buttonsContainer: HTMLDivElement,
  settingsContainer: HTMLDivElement,
  modal: HTMLDialogElement,
  quickActionsContainer: HTMLDivElement,
) {
  openModalBtn.addEventListener("click", () => {
    modal.showModal();
  });
  quickActionsContainer.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement | null;
      if (target === quickActionsContainer || !target) return;
      const button = target.closest<HTMLButtonElement>("button[data-action]");
      if (!button) return;
      const action = button.getAttribute("data-action");
      if (!action) return;
      if (!isValidQuickAction(action)) {
        rendererLogger.devLog(`${action} is not a valid action`);
        return;
      }
      await getQuickAction(action);
    }),
  );
  buttonsContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (target === buttonsContainer || !target) return;
    const btn = target.closest<HTMLButtonElement>(".selection-btn");
    if (!btn) return;
    const targetTab = btn.dataset["category"];
    if (!targetTab) return;
    settingsContainer.dataset["activetab"] = targetTab;
    setActiveItem(btn, buttonsContainer);
  });
}

export { initAppSettings };
