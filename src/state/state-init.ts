import { rendererLogger } from "@/app";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { initSelectionFooter } from "@/components/sidebar/sidebar-selection-ui";
import {
  setFocusMode,
  setToolbarCollapsed,
} from "@/components/toolbar/toolbar-features";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import {
  getVisibleNotes,
  shallowEq,
  sidebarListener,
  updateSelection,
} from "@/state/state-actions";
import { setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";

function initSubscriptions() {
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
    shallowEq,
    // get editor empty state immediately
    { fireImmediately: true },
  );

  stateStore.subscribeSel(
    (state) => state.selectionMode,
    (mode, prev) => {
      if (!prev && mode) {
        initSelectionFooter();
      }
      updateSelection();
    },
    shallowEq,
  );

  stateStore.subscribeSel((state) => state.selectedIds, updateSelection);

  stateStore.subscribeSel((state) => state.focus, setFocusMode);

  noteStore.subscribeSel(
    (state) => ({
      visibleNotes: getVisibleNotes(state),
      searchSnippets: state.searchSnippets,
    }),
    () => {
      sidebarListener();
      const { selectionMode, selectedIds } = stateStore.getState();
      if (!selectionMode || selectedIds.size === 0) return;
      updateSelection();
    },
    shallowEq,
  );

  settingsStore.subscribeSel(
    (state) => state.note_item_display,
    sidebarListener,
    shallowEq,
  );

  settingsStore.subscribeSel(
    (state) => state.toolbar_collapsed,
    (collapsed) => {
      if (typeof collapsed === "boolean") {
        rendererLogger.devLog("Collapsing toolbar");
        try {
          setToolbarCollapsed(collapsed);
        } finally {
          document.dispatchEvent(new CustomEvent("app:refresh-toolbar"));
          rendererLogger.devLog("Dispatched toolbar refresh");
        }
      }
    },
    shallowEq,
    { fireImmediately: true },
  );
}

export { initSubscriptions };
