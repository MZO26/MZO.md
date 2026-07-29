import { updateSettings } from "@/api/api";
import { noteStore, stateStore, type NoteStore } from "@/state/state";
import { getUIItem } from "@/utils/registry";
import { UNTAGGED } from "@shared/constants";
import type { NoteListItem } from "@shared/schemas/note-schema";

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
  matches: {
    snippet: string;
    id: string;
    title: string;
    rank: number;
  }[],
) {
  const matchedIdSet = new Set(matches.map((match) => match.id));
  const searchSnippets: Record<string, string> = {};
  for (const match of matches) {
    searchSnippets[match.id] = match.snippet;
  }
  const activeTag = stateStore.get("activeTag");
  const notes = noteStore.get("notes");
  const visibleIds = notes
    .filter((note) => {
      const isMatch = matchedIdSet.has(note.id);
      const matchesScope = matchesActiveTag(note, activeTag);
      return isMatch && matchesScope;
    })
    .map((note) => note.id);
  noteStore.setState({
    visibleIds,
    searchSnippets,
  });
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

function areArraysShallowEqual<T>(previous: T[], next: T[]) {
  return (
    previous.length === next.length &&
    previous.every(
      (previousItem, itemIndex) => previousItem === next[itemIndex],
    )
  );
}

function getVisibleNotes(state: NoteStore) {
  return state.visibleIds
    .map((id) => state.noteIndex.get(id))
    .filter((note): note is NoteListItem => !!note);
}

export {
  applySearch,
  applyTagView,
  applyUntaggedView,
  applyView,
  areArraysShallowEqual,
  clearActiveTagView,
  getVisibleNotes,
  markNoteAsRecent,
  matchesActiveTag,
  pruneRecentNotes,
  removeRecentNote,
  restoreSidebarScope,
};
