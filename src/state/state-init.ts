import { rendererLogger } from "@/app";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { initSelectionFooter } from "@/components/sidebar/sidebar-selection-ui";
import {
  setFocusMode,
  setToolbarCollapsed,
} from "@/components/toolbar/toolbar-features";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import {
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

  stateStore.subscribeSel(
    (state) => state.focus,
    (focus) => {
      if (typeof focus === "boolean") setFocusMode(focus);
    },
  );

  stateStore.subscribeSel(
    (state) => ({
      activeTag: state.activeTag,
    }),
    sidebarListener,
    shallowEq,
  );

  // note item keys that should trigger rerender
  const SIDEBAR_KEYS = ["title", "snippet", "pinned", "tags"] as const;

  noteStore.subscribeSel(
    (state) => ({
      visibleIds: state.visibleIds,
      noteIndex: state.noteIndex,
      searchSnippets: state.searchSnippets,
    }),
    () => {
      sidebarListener();
      const { selectionMode, selectedIds } = stateStore.getState();
      if (!selectionMode || selectedIds.size === 0) return;
      updateSelection();
    },
    (prev, next) => {
      if (!shallowEq(prev.visibleIds, next.visibleIds)) return false;
      if (!shallowEq(prev.searchSnippets, next.searchSnippets)) return false;
      for (const id of next.visibleIds) {
        const prevNote = prev.noteIndex.get(id);
        const nextNote = next.noteIndex.get(id);
        if (!prevNote || !nextNote) return false;
        const hasChanged = SIDEBAR_KEYS.some(
          (key) => !shallowEq(prevNote[key], nextNote[key]),
        );
        if (hasChanged) return false;
      }
      return true;
    },
    { fireImmediately: true },
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
    // get matching background for collapsed toolbar state on app startup
    { fireImmediately: true },
  );
}

export { initSubscriptions };
