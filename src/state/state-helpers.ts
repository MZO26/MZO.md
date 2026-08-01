import { updateSettings } from "@/api/api";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { noteStore, stateStore, type NoteStore } from "@/state/state";
import { updateNoteCount } from "@/utils/note";
import { getUIItem } from "@/utils/registry";
import { UNTAGGED } from "@shared/constants";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { SidebarParams } from "@shared/types";

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

function areArraysShallowEqual<T>(previous: T[], next: T[]) {
  return (
    previous.length === next.length &&
    previous.every(
      (previousItem, itemIndex) => previousItem === next[itemIndex],
    )
  );
}

function getVisibleNotes(state: NoteStore): NoteListItem[] {
  const visibleNotes: NoteListItem[] = [];
  for (const id of state.visibleIds) {
    if (!id) continue;
    const note = state.noteIndex.get(id);
    if (note) visibleNotes.push(note);
  }
  return visibleNotes;
}

function getSidebarParams(): SidebarParams {
  const { searchQuery, activeTag } = stateStore.getState();
  const noteState = noteStore.getState();
  return {
    visibleNotes: getVisibleNotes(noteState),
    query: typeof searchQuery === "string" ? searchQuery.trim() : "",
    activeTag: activeTag ?? null,
  };
}

function createSidebarListener() {
  return () => {
    const next = getSidebarParams();
    updateNoteCount(next.visibleNotes.length);
    handleSidebarChange(next);
  };
}

const sidebarListener = createSidebarListener();

export {
  applySearch,
  applyTagView,
  applyUntaggedView,
  applyView,
  areArraysShallowEqual,
  clearActiveTagView,
  createSidebarListener,
  getSidebarParams,
  getVisibleNotes,
  markNoteAsRecent,
  matchesActiveTag,
  pruneRecentNotes,
  removeRecentNote,
  restoreSidebarScope,
  sidebarListener,
};
