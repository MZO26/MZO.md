import { rendererLogger } from "@/app";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import {
  areArraysShallowEqual,
  getVisibleNotes,
  sidebarListener,
} from "@/state/state-helpers";
import { findElement, setActiveItem } from "@/utils/dom";
import { compareNotes } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result } from "@shared/types";

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

stateStore.subscribeSel(
  (state) => state.activeId,
  (activeId) => {
    handleEditorEmptyState(activeId);
    if (!activeId) return;
    window.noteAPI.setActiveNote(activeId);
    const sidebar = getAppItem("sidebar");
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${activeId}"]`,
      sidebar,
    );
    if (noteElement) setActiveItem(noteElement, sidebar);
  },
);

noteStore.subscribeSel(getVisibleNotes, sidebarListener, areArraysShallowEqual);

export { initSettings, syncNoteStore };
