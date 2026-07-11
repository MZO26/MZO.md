import { requireElement } from "@/utils/dom";
import { initTippyDelegate } from "@/utils/ui";

function initDeleteDialog() {
  const deleteDialog = requireElement<HTMLDialogElement>("#delete-dialog");
  initTippyDelegate(deleteDialog, deleteDialog);
  return { deleteDialog };
}

function initSettingsDialog() {
  const settingsDialog = requireElement<HTMLDialogElement>(".settings-modal");
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  initTippyDelegate(settingsDialog, settingsDialog, "top");
  return { settingsDialog, settingsContainer };
}

function initSyncDialog() {
  const syncDialog = requireElement<HTMLDialogElement>("#sync-dialog");
  initTippyDelegate(syncDialog, syncDialog, "top");
  return { syncDialog };
}

function initQuickSwitchDialog() {
  const dialogEl = requireElement<HTMLDialogElement>(".quick-switch-dialog");
  const listEl = requireElement<HTMLDivElement>(".quick-switch-list");
  return { dialogEl, listEl };
}

function confirmWithDialog(
  dialog: HTMLDialogElement,
  titleEl: HTMLElement,
  title: string,
): Promise<boolean> {
  titleEl.textContent = title;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    const onClose = () => {
      titleEl.textContent = "";
      resolve(dialog.returnValue === "confirm");
    };
    dialog.addEventListener("close", onClose, { once: true });
  });
}

export {
  confirmWithDialog,
  initDeleteDialog,
  initQuickSwitchDialog,
  initSettingsDialog,
  initSyncDialog,
};
