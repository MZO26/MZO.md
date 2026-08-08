import { rendererLogger } from "@/app";
import { updateSelectionUI } from "@/components/sidebar/sidebar-selection-ui";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { matchesActiveTag } from "@/components/sidebar/sidebar-views";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { compareNotes, updateNoteCount } from "@/utils/note";
import type { SidebarParams } from "@/utils/types";
import type { Id, NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result } from "@shared/shared-types";

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

const selectSidebarNotes = memoize(
  (
    visibleIds: Id[],
    noteIndex: Map<Id, NoteListItem>,
    activeTag: string | null,
  ) => {
    return visibleIds
      .map((id) => noteIndex.get(id))
      .filter(
        (note): note is NoteListItem =>
          !!note && matchesActiveTag(note, activeTag),
      )
      .sort(compareNotes);
  },
);

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
  const { visibleIds, noteIndex, searchSnippets } = noteStore.getState();
  const display = settingsStore.get("note_item_display");
  const visibleNotes = selectSidebarNotes(visibleIds, noteIndex, activeTag);
  return {
    visibleNotes,
    searchSnippets,
    query: searchQuery,
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

function syncNoteStore(notes: readonly NoteListItem[]) {
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
  shallowEq,
  sidebarListener,
  syncNoteStore,
  syncSettingsStore,
  syncStateStore,
  updateSelection,
};
