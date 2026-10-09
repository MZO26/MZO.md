import { rendererLogger } from "@/app";
import { getSidebarParams } from "@/components/sidebar/sidebar-views";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { compareNotes } from "@/utils/note-helpers";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result } from "@shared/shared-types";

function syncSettingsStore(
  settingsResult: Result<Readonly<AppSettings>>,
): Readonly<AppSettings> {
  if (!settingsResult.success) {
    rendererLogger.appError(
      "[syncSettingStore]: Failed to sync settings. Using defaults.",
      settingsResult.error,
    );
    return settingsStore.getState();
  }
  settingsStore.setState(settingsResult.data);
  return settingsStore.getState();
}

function syncNoteStore(notes: readonly NoteListItem[]) {
  const sortedNotes = [...notes].sort(compareNotes);
  noteStore.setState({
    notes: sortedNotes,
    visibleIds: sortedNotes.map((n) => n.id),
    noteIndex: new Map(sortedNotes.map((n) => [n.id, n] as const)),
  });
  return sortedNotes;
}

function syncStateStore(settingsResult: Result<Readonly<AppSettings>>) {
  if (!settingsResult.success) {
    rendererLogger.appError(
      "[syncStateStore]: Failed to sync state. Using defaults.",
      settingsResult?.error,
    );
    return stateStore.getState();
  }
  stateStore.setState({
    activeTag: settingsResult.data.active_tag,
  });
  return stateStore.getState();
}

export { getSidebarParams, syncNoteStore, syncSettingsStore, syncStateStore };
