import { noteStore, searchEngine, settingsStore } from "@/state/state";
import { compareNotes } from "@/utils/note";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result } from "@shared/types";

function initSettings(
  settingsResult: Result<AppSettings> | null | undefined,
): AppSettings {
  if (!settingsResult?.success) {
    console.error(
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
  searchEngine.bulkLoad(sortedNotes);
}

export { initSettings, syncNoteStore };
