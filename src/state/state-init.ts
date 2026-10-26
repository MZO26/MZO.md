import { rendererLogger } from "@/app";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { updateHover } from "@/components/sidebar/sidebar-navigation";
import { updateSelection } from "@/components/sidebar/sidebar-selection";
import { toggleSidebar } from "@/components/sidebar/sidebar-ui";
import { sidebarListener } from "@/components/sidebar/sidebar-views";
import { TOOLBAR_ACTIONS } from "@/components/toolbar/toolbar-actions-init";
import {
  buttonMap,
  updateActiveStates,
} from "@/components/toolbar/toolbar-factory";
import {
  setFocusMode,
  setToolbarCollapsed,
} from "@/components/toolbar/toolbar-features";
import {
  localStore,
  noteStore,
  settingsStore,
  shallowEq,
  stateStore,
} from "@/state/state";
import { setActiveItem } from "@/utils/dom";
import { useCore } from "@/utils/registry";

function initSubscriptions(sidebar: HTMLDivElement) {
  stateStore.subscribeSel(
    (state) => state.activeId,
    (activeId) => {
      handleEditorEmptyState(activeId);
      if (!activeId) return;
      const noteElement = sidebar.querySelector<HTMLDivElement>(
        `.note-item[data-id="${CSS.escape(activeId)}"]`,
      );
      if (noteElement) setActiveItem(noteElement, sidebar);
    },
    shallowEq,
    { fireImmediately: true },
  );

  stateStore.subscribeSel(
    (state) => state.selectionMode,
    updateSelection,
    shallowEq,
  );

  stateStore.subscribeSel(
    (state) => state.hoverId,
    (newId) => updateHover(newId),
  );

  stateStore.subscribeSel((state) => state.selectedIds, updateSelection);

  stateStore.subscribeSel(
    (state) => state.focus,
    (focus) => {
      if (typeof focus === "boolean") setFocusMode(focus);
    },
  );

  stateStore.subscribeSel(
    (state) => state.activeTag,
    sidebarListener,
    shallowEq,
  );

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
      if (prev.noteIndex === next.noteIndex) return true;
      for (const id of next.visibleIds) {
        const prevNote = prev.noteIndex.get(id);
        const nextNote = next.noteIndex.get(id);
        if (prevNote === nextNote) continue;
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

  localStore.subscribeSel(
    (state) => state.sidebarCollapsed,
    (collapsed) => {
      if (typeof collapsed === "boolean") {
        rendererLogger.devLog("Collapsing sidebar");
        toggleSidebar(collapsed);
      }
    },
    shallowEq,
    { fireImmediately: true },
  );

  localStore.subscribeSel(
    (state) => state.toolbarCollapsed,
    (collapsed) => {
      if (typeof collapsed === "boolean") {
        rendererLogger.devLog("Collapsing toolbar");
        setToolbarCollapsed(collapsed);
        updateActiveStates({
          buttonElements: buttonMap,
          actions: TOOLBAR_ACTIONS,
          editor: useCore("editor").editor,
        });
      }
    },
    shallowEq,
    { fireImmediately: true },
  );
}

export { initSubscriptions };
