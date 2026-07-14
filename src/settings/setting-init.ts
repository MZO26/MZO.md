import {
  databaseBackup,
  databaseBackupRestore,
  openAppPath,
  showNotification,
} from "@/api/api";
import { exportSelection } from "@/components/sidebar/sidebar-selection";
import { noteStore } from "@/settings/app-state";
import { settingsContainer, settingsDialog } from "@/settings/dialog-init";
import {
  createSettingsMenu,
  initQuickActionContainer,
} from "@/settings/setting-factory";
import {
  buildSelects,
  setSelectListeners,
} from "@/settings/setting-items-init";
import { applyAppTheme } from "@/settings/theme";
import { createAsyncHandler } from "@/utils/async";
import { requireElement, setActiveItem } from "@/utils/dom";
import { registerAppEvents } from "@/utils/registry";
import type { AppSettings } from "@shared/schemas/store-schema";

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
  const quickActionContainer = initQuickActionContainer();
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
      switch (action) {
        case "open-path":
          const open = await openAppPath();
          if (!open.success) {
            console.error(
              "[quickActions -> open-path]: Failed to open app path:",
              open.error,
            );
            return;
          }
          break;
        case "backup-db":
          const dbBackup = await databaseBackup();
          if (!dbBackup.success) {
            console.error(
              "[quickActions -> backup-db]: Failed to backup db:",
              dbBackup.error,
            );
            return;
          }
          await showNotification("Backup saved.", "");
          return;
        case "backup-db-restore":
          const restore = await databaseBackupRestore();
          if (!restore.success) {
            console.error(
              "[quickActions -> backup-db-restore]: Failed to restore db:",
              restore.error,
            );
            return;
          }
          await showNotification("Backup restored.", "");
          return;
        case "backup-notes":
          const allIds = noteStore.get("notes")?.map((n) => n.id);
          if (!Array.isArray(allIds) || allIds.length === 0) return;
          await exportSelection(allIds);
          break;
      }
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
