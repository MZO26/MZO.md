import { rendererLogger } from "@/app";
import { updateSelectionUI } from "@/components/sidebar/sidebar-selection-ui";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { getSidebarParams } from "@/components/sidebar/sidebar-views";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { compareNotes, updateNoteCount } from "@/utils/note-helpers";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result } from "@shared/shared-types";

let sidebarUpdatePending = false;
let selectionUpdatePending = false;

function shallowEq<A>(a: A, b: A): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !Object.is(value, b.get(key))) return false;
    }
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }
  const keysA = Object.keys(a) as Array<keyof A>;
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(a[key], b[key])
    ) {
      return false;
    }
  }
  return true;
}

function sidebarListener() {
  if (sidebarUpdatePending) return;
  sidebarUpdatePending = true;
  queueMicrotask(() => {
    sidebarUpdatePending = false;
    const next = getSidebarParams();
    updateNoteCount(next.visibleNotes.length);
    rendererLogger.devLog("Sidebar change");
    handleSidebarChange(next);
  });
}

function updateSelection() {
  if (selectionUpdatePending) return;
  selectionUpdatePending = true;
  queueMicrotask(() => {
    selectionUpdatePending = false;
    const next = stateStore.getState();
    updateSelectionUI(next);
  });
}

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

export {
  getSidebarParams,
  shallowEq,
  sidebarListener,
  syncNoteStore,
  syncSettingsStore,
  syncStateStore,
  updateSelection,
};
