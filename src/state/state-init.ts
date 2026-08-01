import { rendererLogger } from "@/app";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { areArraysShallowEqual, getVisibleNotes } from "@/state/state-helpers";
import { findElement, setActiveItem } from "@/utils/dom";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result, SidebarParams } from "@shared/types";

let prevId: string | null = null;
let prevTag: string | null = null;
let prevQuery: string = "";
let prevSidebarParams: SidebarParams | null = null;

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

function syncNoteStore(notes: Readonly<NoteListItem[]>) {
  const sortedNotes = [...notes].sort(compareNotes);
  noteStore.setState({
    notes: sortedNotes,
    visibleIds: sortedNotes.map((n) => n.id),
    noteIndex: new Map(sortedNotes.map((n) => [n.id, n] as const)),
  });
}

function getSidebarParams(): SidebarParams {
  const { searchQuery, activeTag } = stateStore.getState();
  return {
    visibleNotes: getVisibleNotes(noteStore.getState()),
    query: typeof searchQuery === "string" ? searchQuery.trim() : "",
    activeTag: activeTag ?? null,
  };
}

function areSameSidebarParams(
  a: SidebarParams | null,
  b: SidebarParams,
): boolean {
  if (!a) return false;
  return (
    a.query === b.query &&
    a.activeTag === b.activeTag &&
    areArraysShallowEqual(a.visibleNotes, b.visibleNotes)
  );
}

function syncSidebar() {
  const next = getSidebarParams();
  if (areSameSidebarParams(prevSidebarParams, next)) return;
  prevSidebarParams = next;
  updateNoteCount(next.visibleNotes.length);
  handleSidebarChange(next);
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
  const tagChanged = state.activeTag !== prevTag;
  const queryChanged = state.searchQuery !== prevQuery;
  if (tagChanged || queryChanged) {
    prevTag = state.activeTag;
    prevQuery = state.searchQuery;
    syncSidebar();
  }
});

noteStore.subscribeSel(
  getVisibleNotes,
  () => {
    syncSidebar();
  },
  areArraysShallowEqual,
);

export { getSidebarParams, initSettings, syncNoteStore };
