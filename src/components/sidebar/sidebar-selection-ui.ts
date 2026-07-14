import { createIconButton } from "@/components/sidebar/sidebar-features";
import { noteStore, stateStore } from "@/settings/app-state";
import { findElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getUIItem } from "@/utils/registry";
import { SELECTION_ACTIONS } from "@shared/constants";

function selectAllVisibleNotes() {
  const visibleIds = noteStore.get("visibleIds") ?? [];
  stateStore.setState({
    selectedIds: new Set(visibleIds),
    selectionMode: true,
  });
  updateSelectionUI();
}

function initSelectionFooter() {
  const selectionFooter = getUIItem("selectionFooter");
  if (selectionFooter.childElementCount > 0) return;
  const frag = document.createDocumentFragment();
  for (const action of SELECTION_ACTIONS) {
    const button = createIconButton(action.icon);
    button.className = `${action.id}-btn`;
    button.setAttribute("data-action", action.id);
    button.setAttribute("data-tippy-dynamic", "");
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

function updateSelectionFooter() {
  const selectionMode = stateStore.get("selectionMode");
  const selectedCount = stateStore.get("selectedIds").size;
  const selectionFooter = getUIItem("selectionFooter");
  selectionFooter.classList.toggle("collapsed", !selectionMode);
  for (const action of SELECTION_ACTIONS) {
    const button = findElement<HTMLButtonElement>(
      `.${action.id}-btn`,
      selectionFooter,
    );
    if (!button) continue;
    const label = getActionLabel(action.id, selectedCount);
    button.setAttribute("data-tippy-content", label);
    button.disabled = selectedCount === 0 && action.id !== "cancel";
  }
}

function setSelectionMode(enabled: boolean) {
  stateStore.setState({
    selectionMode: enabled,
    selectedIds: enabled ? stateStore.get("selectedIds") : new Set(),
  });
  updateSelectionUI();
}

function updateSelectionUI() {
  const { selectedIds, selectionMode } = stateStore.getState();
  const sidebar = getAppItem("sidebar");
  sidebar.classList.toggle("selection-mode", selectionMode);
  const noteItems = sidebar.querySelectorAll<HTMLDivElement>(".note-item");
  for (const item of noteItems) {
    const id = item?.getAttribute("data-id");
    const isSelected = !!id && selectedIds.has(id);
    item.classList.toggle("selected", isSelected);
    const checkbox = findElement<HTMLInputElement>(".select-checkbox", item);
    if (checkbox) {
      checkbox.checked = isSelected;
    }
  }
  initSelectionFooter();
  updateSelectionFooter();
}

export { selectAllVisibleNotes, setSelectionMode, updateSelectionUI };
