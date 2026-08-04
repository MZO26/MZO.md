import { rendererLogger } from "@/app";
import { updateSelectionUI } from "@/components/sidebar/sidebar-selection-ui";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import {
  noteStore,
  settingsStore,
  stateStore,
  type NoteStore,
} from "@/state/state";
import { compareNotes, updateNoteCount } from "@/utils/note";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result, SelectionParams, SidebarParams } from "@shared/types";

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

function getVisibleNotes(state: NoteStore) {
  return computeVisibleNotes(state.visibleIds, state.noteIndex);
}

function shallowEq<T>(previous: T[], next: T[]) {
  return (
    previous.length === next.length &&
    previous.every(
      (previousItem, itemIndex) => previousItem === next[itemIndex],
    )
  );
}

function shallowObjectEq<T extends object>(previous: T, next: T): boolean {
  if (Object.is(previous, next)) return true;
  if (
    typeof previous !== "object" ||
    previous === null ||
    typeof next !== "object" ||
    next === null
  )
    return false;
  const prevKeys = Object.keys(previous) as (keyof T)[];
  const nextKeys = Object.keys(next) as (keyof T)[];
  if (prevKeys.length !== nextKeys.length) return false;
  return prevKeys.every(
    (key) =>
      // check if key exists in both
      Object.prototype.hasOwnProperty.call(next, key) &&
      Object.is(previous[key], next[key]),
  );
}

function getSidebarParams(): SidebarParams {
  const { searchQuery, activeTag } = stateStore.getState();
  const noteState = noteStore.getState();
  return {
    visibleNotes: getVisibleNotes(noteState),
    query: searchQuery?.trim() || "",
    activeTag: activeTag ?? null,
  };
}

function getSelectionParams(): SelectionParams {
  const { selectionMode, selectedIds } = stateStore.getState();
  return { selectionMode, selectedIds };
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
    const next = getSelectionParams();
    updateSelectionUI(next);
  });
}

function syncSettingsStore(
  settingsResult: Result<AppSettings> | null | undefined,
): AppSettings {
  if (!settingsResult?.success) {
    rendererLogger.appError(
      "[initSettings]: Failed to sync settings. Using store state.",
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

export {
  getSidebarParams,
  getVisibleNotes,
  memoize,
  shallowEq,
  shallowObjectEq,
  sidebarListener,
  syncNoteStore,
  syncSettingsStore,
  updateSelection,
};
