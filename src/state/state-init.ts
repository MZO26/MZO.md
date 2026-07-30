import { rendererLogger } from "@/app";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { refreshSidebar } from "@/components/sidebar/sidebar-note-items";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-ui";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { areArraysShallowEqual, getVisibleNotes } from "@/state/state-helpers";
import { findElement, setActiveItem } from "@/utils/dom";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result } from "@shared/types";

let prevId: string | null = null;
let prevSearchQuery: string = "";

function initSettings(
  settingsResult: Result<AppSettings> | null | undefined,
): AppSettings {
  if (!settingsResult?.success) {
    rendererLogger.appError(
      "[initSettings]: Failed to init settings. Using store state.",
      settingsResult?.error,
    );
    return settingsStore.getState();
  }
  settingsStore.setState(settingsResult.data);
  return settingsStore.getState();
}

function syncNoteStore(notes: NoteListItem[]) {
  const sortedNotes = notes.sort(compareNotes);
  noteStore.setState({
    notes: sortedNotes,
    visibleIds: sortedNotes.map((n) => n.id),
    noteIndex: new Map(sortedNotes.map((n) => [n.id, n] as const)),
  });
}

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

export { initSettings, syncNoteStore };
