import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { initSelectionFooter } from "@/components/sidebar/sidebar-selection-ui";
import { noteStore, stateStore } from "@/state/state";
import {
  getVisibleNotes,
  shallowEq,
  sidebarListener,
  updateSelection,
} from "@/state/state-actions";
import { setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";

stateStore.subscribeSel(
  (state) => state.activeId,
  (activeId) => {
    handleEditorEmptyState(activeId);
    if (!activeId) return;
    window.noteAPI.setActiveNote(activeId);
    const sidebar = getAppItem("sidebar");
    const noteElement = sidebar.querySelector<HTMLDivElement>(
      `.note-item[data-id="${CSS.escape(activeId)}"]`,
    );
    if (noteElement) setActiveItem(noteElement, sidebar);
  },
);

stateStore.subscribeSel(
  (state) => state.selectionMode,
  (mode, prev) => {
    if (!prev && mode) {
      initSelectionFooter();
    }
    updateSelection();
  },
);

stateStore.subscribeSel((state) => state.selectedIds, updateSelection);

noteStore.subscribeSel(
  getVisibleNotes,
  () => {
    sidebarListener();
    const { selectionMode, selectedIds } = stateStore.getState();
    if (!selectionMode || selectedIds.size === 0) return;
    updateSelection();
  },
  shallowEq,
);
