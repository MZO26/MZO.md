import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { refreshSidebar } from "@/components/sidebar/sidebar-note-items";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-ui";
import { noteStore, stateStore } from "@/state/state";
import { areArraysShallowEqual, getVisibleNotes } from "@/state/state-helpers";
import { findElement, setActiveItem } from "@/utils/dom";
import { updateNoteCount } from "@/utils/note";
import { getAppItem } from "@/utils/registry";

let prevId: string | null = null;
let prevSearchQuery: string = "";

stateStore.subscribe((state) => {
  if (state.activeId !== prevId) {
    prevId = state.activeId;
    handleEditorEmptyState(state.activeId);
    if (state.activeId == null) return;
    window.noteAPI.setActiveNote(state.activeId);
    const sidebar = getAppItem("sidebar");
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${state.activeId}"]`,
      sidebar,
    );
    if (noteElement) setActiveItem(noteElement, sidebar);
  }
  if (state.searchQuery !== prevSearchQuery) {
    prevSearchQuery = state.searchQuery;
    requestAnimationFrame(() => {
      handleSidebarEmptyState();
    });
  }
});

noteStore.subscribeSel(
  getVisibleNotes,
  (visibleNotes) => {
    updateNoteCount(visibleNotes.length);
    refreshSidebar(visibleNotes);
  },
  areArraysShallowEqual,
);
