import { getAll, getAllSettings, updateSettings } from "@/api/api";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { handleSidebarChange } from "@/components/sidebar/sidebar-note-items";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-ui";
import { NoteSearch, type SearchMatchResult } from "@/notes/search";
import { findElement, setActiveItem } from "@/utils/dom";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem, getUIItem } from "@/utils/registry";
import { DEFAULT_SETTINGS, UNTAGGED } from "@shared/constants";
import type { Note, NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { SidebarChange } from "@shared/types";

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

let prevId: string | null = null;
let prevSearchQuery: string = "";
let prevVisibleIds: string[] | null = null;
let prevSidebarChange: SidebarChange | null = null;

const stateStore = createStore<AppState>(STATE_STORE);

const settingsStore = createStore<AppSettings>(DEFAULT_SETTINGS);

interface NoteStore {
  notes: NoteListItem[];
  visibleIds: string[];
  noteIndex: Map<string, NoteListItem>;
  activeNote: Note | null;
  sidebarChange: SidebarChange | null;
  recentNotes: string[];
}

const NOTE_STORE: NoteStore = {
  notes: [],
  visibleIds: [],
  noteIndex: new Map<string, NoteListItem>(),
  activeNote: null,
  sidebarChange: null,
  recentNotes: [],
};

const noteStore = createStore<NoteStore>(NOTE_STORE);

function createStore<T>(initialState: T) {
  let state = initialState;
  const listeners = new Set<(state: T) => void>();

  const getState = () => state;

  const get = <K extends keyof T>(key: K): T[K] => {
    return state[key];
  };

  const setState = (newState: Partial<T> | ((state: T) => Partial<T>)) => {
    const nextState =
      typeof newState === "function"
        ? (newState as (state: T) => Partial<T>)(state)
        : newState;

    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener(state));
  };

  const subscribe = (listener: (state: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return { getState, get, setState, subscribe };
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
      sidebarChange: { type: "reload" },
    });
    searchEngine.bulkLoad(sortedNotes);
  }
}

function getVisibleNotes(state: NoteStore) {
  const notes = state.visibleIds
    .map((id) => state.noteIndex.get(id))
    .filter((note): note is NoteListItem => !!note);
  return notes;
}

//------------------------------------------------------------

// active tag logic

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
    sidebarChange: { type: "reload" },
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

//------------------------------------------------------------

// search logic

// applies the search to the note state to only show searched items or empty state

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
    sidebarChange: { type: "reload" },
  });
}

// removes search scope but stays in activeTag scope if there is one

function restoreSidebarScope() {
  const activeTag = stateStore.get("activeTag");
  noteStore.setState((state) => ({
    visibleIds: state.notes
      .filter((note) => matchesActiveTag(note, activeTag))
      .map((note) => note.id),
    sidebarChange: { type: "reload" },
  }));
}

//------------------------------------------------------------

// recent notes logic

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

//------------------------------------------------------------

// store subscribers

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

const searchEngine = new NoteSearch(noteStore.getState().notes);

noteStore.subscribe((state) => {
  if (state.visibleIds !== prevVisibleIds) {
    prevVisibleIds = state.visibleIds;
    updateNoteCount(state.visibleIds.length);
  }
  if (state.sidebarChange !== prevSidebarChange) {
    const change = state.sidebarChange;
    prevSidebarChange = change;
    if (change) {
      handleSidebarChange(change, getVisibleNotes(state));
      noteStore.setState({ sidebarChange: null });
    }
  }
});

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
