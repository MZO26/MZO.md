import { requireElement } from "@/utils/dom";
import { initTippyDelegate } from "@/utils/ui";

function initDeleteDialog() {
  const deleteDialog = requireElement<HTMLDialogElement>("#delete-dialog");
  const confirmBtn = requireElement<HTMLButtonElement>("#confirm-delete-btn");
  initTippyDelegate(deleteDialog, deleteDialog);
  return { deleteDialog, confirmBtn };
}

function initMergeDialog() {
  const mergeDialog = requireElement<HTMLDialogElement>(".merge-modal");
  const mergeInput = requireElement<HTMLInputElement>("#noteId");
  initTippyDelegate(mergeDialog, mergeDialog);
  return { mergeDialog, mergeInput };
}

function initSettingsDialog() {
  const settingsDialog = requireElement<HTMLDialogElement>(".settings-modal");
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  initTippyDelegate(settingsDialog, settingsDialog);
  return { settingsDialog, settingsContainer };
}

export { initDeleteDialog, initMergeDialog, initSettingsDialog };
