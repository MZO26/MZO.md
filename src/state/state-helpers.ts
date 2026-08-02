import { updateSettings } from "@/api/api";
import { rendererLogger } from "@/app";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { noteStore, stateStore, type NoteStore } from "@/state/state";
import { updateNoteCount } from "@/utils/note";
import { getUIItem } from "@/utils/registry";
import { UNTAGGED } from "@shared/constants";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { SidebarParams } from "@shared/types";

let sidebarUpdatePending = false;

function matchesActiveTag(note: NoteListItem, activeTag: string | null) {
  if (activeTag === null) return true;
  if (activeTag === UNTAGGED) return !note.tags || note.tags.length === 0;
  return note.tags.includes(activeTag);
}

function applyView(nextTag: string | null) {
  const activeTag = stateStore.get("activeTag");
  if (activeTag === nextTag) return;
  stateStore.setState({ activeTag: nextTag, searchQuery: "" });
  getUIItem("searchInput").value = "";
  updateSettings({ active_tag: nextTag });
  noteStore.setState((state) => ({
    visibleIds: state.notes
      .filter((note) => matchesActiveTag(note, nextTag))
      .map((note) => note.id),
  }));
}

function applyTagView(tagId: string) {
  const normalizedTag = tagId.trim().toLowerCase();
  if (!normalizedTag) return;
  applyView(normalizedTag);
}

function applyUntaggedView() {
  applyView(UNTAGGED);
}

function clearActiveTagView() {
  applyView(null);
}

function applySearch(
  matches: { snippet: string; id: string; title: string; rank: number }[],
) {
  const searchSnippets: Record<string, string> = {};
  const visibleIds: string[] = [];
  const activeTag = stateStore.get("activeTag");
  const noteIndex = noteStore.get("noteIndex");
  for (const match of matches) {
    searchSnippets[match.id] = match.snippet;
    const note = noteIndex.get(match.id);
    if (note && matchesActiveTag(note, activeTag)) {
      visibleIds.push(match.id);
    }
  }
  noteStore.setState({ visibleIds, searchSnippets });
}

function restoreSidebarScope() {
  const activeTag = stateStore.get("activeTag");
  noteStore.setState((state) => ({
    visibleIds: state.notes
      .filter((note) => matchesActiveTag(note, activeTag))
      .map((note) => note.id),
    searchSnippets: {},
  }));
}

function markNoteAsRecent(noteId: string) {
  noteStore.setState((state) => {
    const recentNotes = state.recentNotes.filter(
      (id) => id !== noteId && state.noteIndex.has(id),
    );
    return {
      recentNotes: [noteId, ...recentNotes].slice(0, 5),
    };
  });
}

function removeRecentNote(noteId: string) {
  noteStore.setState((state) => ({
    recentNotes: state.recentNotes.filter((id) => id !== noteId),
  }));
}

function pruneRecentNotes() {
  noteStore.setState((state) => ({
    recentNotes: state.recentNotes.filter((id) => state.noteIndex.has(id)),
  }));
}

function memoize<T extends any[], R>(fn: (...args: T) => R) {
  let lastArgs: T | null = null;
  let lastResult: R;
  return (...args: T): R => {
    const prevArgs = lastArgs;
    if (prevArgs && args.every((val, i) => val === prevArgs[i])) {
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

function areArraysShallowEqual<T>(previous: T[], next: T[]) {
  return (
    previous.length === next.length &&
    previous.every(
      (previousItem, itemIndex) => previousItem === next[itemIndex],
    )
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

export {
  applySearch,
  applyTagView,
  applyUntaggedView,
  applyView,
  areArraysShallowEqual,
  clearActiveTagView,
  getSidebarParams,
  getVisibleNotes,
  markNoteAsRecent,
  matchesActiveTag,
  pruneRecentNotes,
  removeRecentNote,
  restoreSidebarScope,
  sidebarListener,
};
