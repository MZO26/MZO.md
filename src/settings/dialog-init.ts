import { requireElement } from "@/utils/dom";
import { initTippyDelegate } from "@/utils/ui";

function initDeleteDialog() {
  const deleteDialog = requireElement<HTMLDialogElement>("#delete-dialog");
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
  return { syncDialog };
}

function initQuickSwitchDialog() {
  const switchDialog = requireElement<HTMLDialogElement>(
    ".quick-switch-dialog",
  );
  const listEl = requireElement<HTMLDivElement>(".quick-switch-list");
  return { switchDialog, listEl };
}

function initMathDialog() {
  const mathDialog = requireElement<HTMLDialogElement>(".math-dialog");
  return { mathDialog };
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

export const { deleteDialog } = initDeleteDialog();
export const { syncDialog } = initSyncDialog();
export const { settingsDialog, settingsContainer } = initSettingsDialog();
export const { switchDialog, listEl } = initQuickSwitchDialog();
export const { mathDialog } = initMathDialog();

export {
  confirmWithDialog,
  initDeleteDialog,
  initMathDialog,
  initQuickSwitchDialog,
  initSettingsDialog,
  initSyncDialog,
};
