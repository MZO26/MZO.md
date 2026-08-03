import { rendererLogger } from "@/app";
import { createIconButton } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getUIItem } from "@/utils/registry";
import { SELECTION_ACTIONS } from "@shared/constants/renderer-constants";
import type { SelectionParams } from "@shared/types";

function getActionLabel(actionId: string, selectedCount: number): string {
  switch (actionId) {
    case "cancel":
      return "Cancel selection";
    case "pin":
      return `Toggle Pin for ${selectedCount} ${selectedCount === 1 ? "note" : "notes"}`;
    case "export":
      return `Export ${selectedCount} ${selectedCount === 1 ? "note" : "notes"}`;
    case "copy-rich-text":
      return `Copy rich-text of ${selectedCount} ${selectedCount === 1 ? "note" : "notes"}`;
    case "delete":
      return `Delete ${selectedCount} ${selectedCount === 1 ? "note" : "notes"}`;
    default:
      return "";
  }
}

function initSelectionFooter() {
  const selectionFooter = getUIItem("selectionFooter");
  if (selectionFooter.dataset["initialized"] === "true") {
    rendererLogger.devLog("No rebuild of selection footer");
    return;
  }
  const frag = document.createDocumentFragment();
  for (const action of SELECTION_ACTIONS) {
    const button = createIconButton(action.icon);
    button.className = `${action.id}-btn`;
    button.dataset["action"] = action.id;
    frag.appendChild(button);
  }
  selectionFooter.appendChild(frag);
  renderIcons(selectionFooter);
  selectionFooter.dataset["initialized"] = "true";
}

function updateSelectionFooter(
  selectedIds: Set<string>,
  selectionMode: boolean,
) {
  const selectedCount = selectedIds.size;
  const selectionFooter = getUIItem("selectionFooter");
  selectionFooter.classList.toggle("collapsed", !selectionMode);
  for (const action of SELECTION_ACTIONS) {
    const button = selectionFooter.querySelector<HTMLButtonElement>(
      `.${CSS.escape(`${action.id}-btn`)}`,
    );
    if (!button) continue;
    const label = getActionLabel(action.id, selectedCount);
    button.title = label;
    button.disabled = selectedCount === 0 && action.id !== "cancel";
  }
}

function updateSelectionUI(selectionParams: SelectionParams) {
  const { selectionMode, selectedIds } = selectionParams;
  const sidebar = getAppItem("sidebar");
  sidebar.classList.toggle("selection-mode", selectionMode);
  const noteItems = sidebar.querySelectorAll<HTMLDivElement>(".note-item");
  for (const item of noteItems) {
    const id = item.getAttribute("data-id");
    const isSelected = selectionMode && !!id && selectedIds.has(id);
    item.classList.toggle("selected", isSelected);
    const checkbox = item.querySelector<HTMLInputElement>(".select-checkbox");
    if (checkbox) {
      checkbox.checked = isSelected;
    }
  }
  updateSelectionFooter(selectedIds, selectionMode);
}

export { initSelectionFooter, updateSelectionUI };
