import {
  databaseBackup,
  databaseVacuum,
  openAppPath,
  showNotification,
} from "@/api/api";
import { exportSelection } from "@/components/sidebar/sidebar-selection";
import { initSettingsDialog } from "@/settings/dialog-init";
import { createSettingsMenu } from "@/settings/setting-factory";
import { buildSelects } from "@/settings/setting-items";
import { setSelectListeners } from "@/settings/setting-items-init";
import { applyAppTheme } from "@/settings/theme";
import { createAsyncHandler } from "@/utils/async";
import { requireElement, setActiveItem } from "@/utils/dom";
import { registerAppEvents } from "@/utils/registry";
import { formatBytes, useDelayedSpinner } from "@/utils/ui";
import type { AppSettings } from "@shared/schemas/store-schema";
import { noteStore } from "./app-state";

async function initAppSettings(settings: AppSettings) {
  const { settingsDialog, settingsContainer } = initSettingsDialog();
  const buttonsContainer = createSettingsMenu();
  settingsContainer.appendChild(buttonsContainer);
  buildSelects();
  setSelectListeners(settings, settingsContainer);
  const openModalBtn = requireElement<HTMLButtonElement>(".settings-btn");
  const firstActiveBtn = requireElement<HTMLButtonElement>(
    "button:first-child",
    buttonsContainer,
  );
  const quickActionsContainer = requireElement<HTMLDivElement>(
    ".settings-quick-actions",
  );
  if (firstActiveBtn) setActiveItem(firstActiveBtn, buttonsContainer);
  await applyAppTheme(settings["theme"]);
  applyModalListeners(
    openModalBtn,
    buttonsContainer,
    settingsContainer,
    settingsDialog,
    quickActionsContainer,
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
        case "backup-notes":
          const allIds = noteStore.get("notes").map((n) => n.id);
          await exportSelection(allIds);
          break;
        case "vacuum-db":
          const stopSpinner = useDelayedSpinner();
          try {
            const savedBytes = await databaseVacuum();
            if (savedBytes.success) {
              await showNotification(
                "Optimized Database.",
                savedBytes.data === 0
                  ? "Database already compact"
                  : `Reclaimed ${formatBytes(savedBytes.data)} of space`,
              );
            }
          } catch (err) {
            console.error(
              "[quickActions -> vacuum-db]: Failed to vacuum db:",
              err,
            );
            showNotification("Failed to optimize database.", "");
          } finally {
            if (stopSpinner) stopSpinner();
          }
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
