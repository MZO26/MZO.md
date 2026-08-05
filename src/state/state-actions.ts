import { rendererLogger } from "@/app";
import { updateSelectionUI } from "@/components/sidebar/sidebar-selection-ui";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { matchesActiveTag } from "@/components/sidebar/sidebar-views";
import {
  noteStore,
  settingsStore,
  stateStore,
  type NoteStore,
} from "@/state/state";
import { compareNotes, updateNoteCount } from "@/utils/note";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result, SidebarParams } from "@shared/types";

let sidebarUpdatePending = false;
let selectionUpdatePending = false;

function memoize<T extends any[], R>(
  fn: (...args: T) => R,
  equalFn: (prev: T, next: T) => boolean = (prev, next) =>
    prev.length === next.length && next.every((val, i) => val === prev[i]),
) {
  let lastArgs: T | null = null;
  let lastResult: R;
  return (...args: T): R => {
    if (lastArgs && equalFn(lastArgs, args)) {
      rendererLogger.devLog("Returning old result");
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
}

const computeVisibleNotes = memoize(
  (visibleIds: string[], noteIndex: Map<string, NoteListItem>) => {
    return visibleIds
      .map((id) => noteIndex.get(id))
      .filter((note): note is NoteListItem => !!note);
  },
);

function getVisibleNotes(noteState: NoteStore) {
  return computeVisibleNotes(noteState.visibleIds, noteState.noteIndex);
}

function shallowEq<T>(a: T, b: T): boolean {
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
  const keysA = Object.keys(a) as Array<keyof T>;
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

function getSidebarParams(): SidebarParams {
  const { searchQuery, activeTag, activeId } = stateStore.getState();
  const noteState = noteStore.getState();
  const display = settingsStore.get("note_item_display");
  const visibleNotes = getVisibleNotes(noteState).filter((n) =>
    matchesActiveTag(n, activeTag),
  );
  return {
    visibleNotes,
    searchSnippets: noteState.searchSnippets,
    query: searchQuery?.trim() || "",
    activeTag,
    activeId,
    display,
  };
}

function sidebarListener() {
  if (sidebarUpdatePending) return;
  sidebarUpdatePending = true;
  queueMicrotask(() => {
    sidebarUpdatePending = false;
    const next = getSidebarParams();
    updateNoteCount(next.visibleNotes.length);
    handleSidebarChange(next);
  });
}

function updateSelection() {
  if (selectionUpdatePending) return;
  selectionUpdatePending = true;
  queueMicrotask(() => {
    selectionUpdatePending = false;
    updateSelectionUI(stateStore.getState());
  });
}

function syncSettingsStore(
  settingsResult: Result<AppSettings> | null | undefined,
): AppSettings {
  if (!settingsResult?.success) {
    rendererLogger.appError(
      "[syncSettingStore]: Failed to sync settings. Using defaults.",
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
  return sortedNotes;
}

function syncStateStore(
  settingsResult: Result<AppSettings> | null | undefined,
) {
  if (!settingsResult?.success) {
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
  getVisibleNotes,
  memoize,
  shallowEq,
  sidebarListener,
  syncNoteStore,
  syncSettingsStore,
  syncStateStore,
  updateSelection,
};
