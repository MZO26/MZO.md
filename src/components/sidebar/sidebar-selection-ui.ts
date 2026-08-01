import { noteStore, stateStore } from "@/state/state";
import { createIconButton, findElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getUIItem } from "@/utils/registry";
import { SELECTION_ACTIONS } from "@shared/constants";

function selectAllVisibleNotes() {
  const visibleIds = noteStore.get("visibleIds") ?? [];
  const selectedIds = new Set(visibleIds);
  const selectionMode = true;
  stateStore.setState({
    selectedIds,
    selectionMode,
  });
  updateSelectionUI(selectedIds, selectionMode);
}

function initSelectionFooter() {
  const selectionFooter = getUIItem("selectionFooter");
  if (selectionFooter.childElementCount > 0) return;
  const frag = document.createDocumentFragment();
  for (const action of SELECTION_ACTIONS) {
    const button = createIconButton(action.icon);
    button.className = `${action.id}-btn`;
    button.setAttribute("data-action", action.id);
    frag.appendChild(button);
  }
  selectionFooter.appendChild(frag);
  renderIcons(selectionFooter);
}

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

function updateSelectionFooter(
  selectedIds: Set<string>,
  selectionMode: boolean,
) {
  const selectedCount = selectedIds.size;
  const selectionFooter = getUIItem("selectionFooter");
  selectionFooter.classList.toggle("collapsed", !selectionMode);
  for (const action of SELECTION_ACTIONS) {
    const button = findElement<HTMLButtonElement>(
      `.${action.id}-btn`,
      selectionFooter,
    );
    if (!button) continue;
    const label = getActionLabel(action.id, selectedCount);
    button.title = label;
    button.disabled = selectedCount === 0 && action.id !== "cancel";
  }
}

function setSelectionMode(enabled: boolean) {
  const prevSelectedIds = stateStore.get("selectedIds");
  const nextSelectedIds = enabled
    ? new Set<string>(prevSelectedIds)
    : new Set<string>();
  stateStore.setState({
    selectionMode: enabled,
    selectedIds: nextSelectedIds,
  });
  updateSelectionUI(nextSelectedIds, enabled);
}

function updateSelectionUI(selectedIds: Set<string>, selectionMode: boolean) {
  const sidebar = getAppItem("sidebar");
  sidebar.classList.toggle("selection-mode", selectionMode);
  const noteItems = sidebar.querySelectorAll<HTMLDivElement>(".note-item");
  for (const item of noteItems) {
    const id = item.getAttribute("data-id");
    const isSelected = selectionMode && !!id && selectedIds.has(id);
    item.classList.toggle("selected", isSelected);
    const checkbox = findElement<HTMLInputElement>(".select-checkbox", item);
    if (checkbox) {
      checkbox.checked = isSelected;
    }
  }
  initSelectionFooter();
  updateSelectionFooter(selectedIds, selectionMode);
}

export { selectAllVisibleNotes, setSelectionMode, updateSelectionUI };
