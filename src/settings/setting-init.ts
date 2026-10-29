import { openExternal } from "@/api/api";
import { rendererLogger } from "@/app";
import { applyAppTheme, getQuickAction } from "@/settings/setting-actions";
import {
  buildSelects,
  createGithubRef,
  createQuickActionContainer,
  createSettingsMenu,
} from "@/settings/setting-factory";
import { setSelectListeners } from "@/settings/setting-items-init";
import { QUICK_ACTIONS } from "@/utils/constants";
import { createAsyncHandler } from "@/utils/helpers";
import { useDialog } from "@/utils/registry";
import type { QuickAction } from "@/utils/types";
import { requireElement, setActiveItem } from "@/utils/ui";
import { appEvents } from "@shared/event-emitter";
import type { AppSettings } from "@shared/schemas/store-schema";
import { APP_EVENTS } from "@shared/shared-constants";

async function initAppSettings(settings: Readonly<AppSettings>) {
  const buttonsContainer = createSettingsMenu();
  const { settingsContainer, settingsDialog } = useDialog(
    "settingsContainer",
    "settingsDialog",
  );
  settingsContainer.appendChild(buttonsContainer);
  buildSelects();
  setSelectListeners(settings, settingsContainer);
  const openModalBtn = requireElement<HTMLButtonElement>(".settings-btn");
  const firstActiveBtn = requireElement<HTMLButtonElement>(
    "button:first-child",
    buttonsContainer,
  );
  const quickActionsContainer = createQuickActionContainer();
  const githubRef = createGithubRef();
  if (firstActiveBtn) setActiveItem(firstActiveBtn, buttonsContainer);
  await applyAppTheme(settings["theme"]);
  applyModalListeners(
    openModalBtn,
    buttonsContainer,
    settingsContainer,
    settingsDialog,
    quickActionsContainer,
    githubRef,
  );
  appEvents.on(APP_EVENTS.OPEN_SETTINGS, () => settingsDialog.showModal());
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
  githubLink: HTMLAnchorElement,
) {
  openModalBtn.addEventListener("click", () => {
    modal.showModal();
  });
  githubLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (!(e.target instanceof HTMLAnchorElement)) return;
    void openExternal(e.target.href);
  });
  quickActionsContainer.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof Element)) return;
      const button = e.target.closest<HTMLButtonElement>("button[data-action]");
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
    if (!(e.target instanceof Element)) return;
    const btn = e.target.closest<HTMLButtonElement>(".selection-btn");
    if (!btn) return;
    const targetTab = btn.dataset["category"];
    if (!targetTab) return;
    settingsContainer.dataset["activetab"] = targetTab;
    setActiveItem(btn, buttonsContainer);
  });
}

export { initAppSettings };
