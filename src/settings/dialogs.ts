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

export { initDeleteDialog, initMergeDialog };
