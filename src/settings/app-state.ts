import { getAll, getAllSettings, updateSettings } from "@/api/api";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { refreshSidebar } from "@/components/sidebar/sidebar-note-items";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-ui";
import { NoteSearch, type SearchMatchResult } from "@/notes/search";
import { findElement, setActiveItem } from "@/utils/dom";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem, getUIItem } from "@/utils/registry";
import { DEFAULT_SETTINGS, UNTAGGED } from "@shared/constants";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";

interface AppState {
  activeId: string | null;
  searchQuery: string;
  selectionMode: boolean;
  selectedIds: Set<string>;
  activeTag: string | null;
}

const STATE_STORE: AppState = {
  activeId: null,
  searchQuery: "",
  selectionMode: false,
  selectedIds: new Set<string>(),
  activeTag: null,
};

interface NoteStore {
  notes: NoteListItem[];
  visibleIds: string[];
  noteIndex: Map<string, NoteListItem>;
  recentNotes: string[];
}

const NOTE_STORE: NoteStore = {
  notes: [],
  visibleIds: [],
  noteIndex: new Map<string, NoteListItem>(),
  recentNotes: [],
};

let prevId: string | null = null;
let prevSearchQuery: string = "";

const stateStore = createStore<AppState>(STATE_STORE);

const settingsStore = createStore<AppSettings>(DEFAULT_SETTINGS);

const noteStore = createStore<NoteStore>(NOTE_STORE);

const searchEngine = new NoteSearch();

function createStore<T extends object>(initialState: T) {
  let state = initialState;
  const listeners = new Set<(state: T) => void>();
  const getState = () => state;
  const get = <K extends keyof T>(key: K): T[K] => state[key];
  const notify = () => {
    [...listeners].forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error("[store] listener failed", error);
      }
    });
  };
  const setState = (newState: Partial<T> | ((state: T) => Partial<T>)) => {
    const nextState =
      typeof newState === "function" ? newState(state) : newState;
    if (!nextState || Object.keys(nextState).length === 0) return;
    let hasChanged = false;
    for (const key of Object.keys(nextState) as Array<keyof T>) {
      if (!Object.is(state[key], nextState[key])) {
        hasChanged = true;
        break;
      }
    }
    if (!hasChanged) return;
    state = { ...state, ...nextState };
    notify();
  };
  const subscribe = (listener: (state: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const subscribeSel = <S>(
    selector: (state: T) => S,
    listener: (selected: S) => void,
    isEqual: (previous: S, next: S) => boolean = Object.is,
  ) => {
    let previousSelected = selector(state);
    return subscribe((state) => {
      const nextSelected = selector(state);
      if (isEqual(previousSelected, nextSelected)) return;
      previousSelected = nextSelected;
      listener(nextSelected);
    });
  };
  return { getState, get, setState, subscribe, subscribeSel };
}

async function loadSettings(): Promise<AppSettings> {
  const result = await getAllSettings();
  if (!result.success) {
    console.error("[loadSettings]: Failed to load settings. Using defaults.");
    return settingsStore.getState();
  }
  settingsStore.setState(result.data);
  return settingsStore.getState();
}

async function syncNoteStore() {
  const result = await getAll();
  if (!result.success) {
    console.error("[getAll]: Failed to fetch all notes:", result.error);
    return;
  } else {
    const sortedNotes = result.data.sort(compareNotes);
    noteStore.setState({
      notes: sortedNotes,
      visibleIds: sortedNotes.map((n) => n.id),
      noteIndex: new Map(sortedNotes.map((n) => [n.id, n] as const)),
    });
    searchEngine.bulkLoad(sortedNotes);
  }
}

function matchesActiveTag(note: NoteListItem, activeTag: string | null) {
  if (activeTag === null) return true;
  if (activeTag === UNTAGGED) return !note.tags || note.tags.length === 0;
  return note.tags.includes(activeTag);
}

function applyView(nextTag: string | null) {
  const { activeTag } = stateStore.getState();
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

function applySearch(searchMatches: SearchMatchResult[]) {
  const matchedIdSet = new Set(searchMatches.map((match) => match.item.id));
  const activeTag = stateStore.get("activeTag");
  const notes = noteStore.get("notes");
  const visibleIds = notes
    .filter((note) => {
      const isSearchMatch = matchedIdSet.has(note.id);
      const matchesScope = matchesActiveTag(note, activeTag);
      return isSearchMatch && matchesScope;
    })
    .map((note) => note.id);
  noteStore.setState({
    visibleIds,
  });
}

function restoreSidebarScope() {
  const activeTag = stateStore.get("activeTag");
  noteStore.setState((state) => ({
    visibleIds: state.notes
      .filter((note) => matchesActiveTag(note, activeTag))
      .map((note) => note.id),
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
  const notes = state.visibleIds
    .map((id) => state.noteIndex.get(id))
    .filter((note): note is NoteListItem => !!note);
  return notes;
}

stateStore.subscribe((state) => {
  if (state.activeId !== prevId) {
    prevId = state.activeId;
    handleEditorEmptyState(state.activeId);
    if (state.activeId == null) return;
    window.noteAPI.setActiveNote(state.activeId);
    const sidebar = getAppItem("sidebar");
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${state.activeId}"]`,
      sidebar,
    );
    if (noteElement) setActiveItem(noteElement, sidebar);
  }
  if (state.searchQuery !== prevSearchQuery) {
    prevSearchQuery = state.searchQuery;
    requestAnimationFrame(() => {
      handleSidebarEmptyState();
    });
  }
});

noteStore.subscribeSel(
  getVisibleNotes,
  (visibleNotes) => {
    updateNoteCount(visibleNotes.length);
    refreshSidebar(visibleNotes);
  },
  areArraysShallowEqual,
);

export {
  applySearch,
  applyTagView,
  applyUntaggedView,
  clearActiveTagView,
  loadSettings,
  markNoteAsRecent,
  matchesActiveTag,
  noteStore,
  pruneRecentNotes,
  removeRecentNote,
  restoreSidebarScope,
  searchEngine,
  settingsStore,
  stateStore,
  syncNoteStore,
};
