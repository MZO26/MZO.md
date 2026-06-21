import { getAll, getAllSettings } from "@/api/api";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { handleSidebarChange } from "@/components/sidebar/sidebar-note-items";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-ui";
import { NoteSearch } from "@/notes/search";
import { findElement, setActiveItem } from "@/utils/dom";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import type { Note, NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { SidebarChange } from "@shared/types";

const DEFAULT_STORE: AppSettings = {
  theme: "system",
  "font-family": "system",
  "font-size": "18",
  "line-height": "1.5",
  "code-theme": "balanced",
  highlight: "context",
  spellcheck: false,
  "delete-confirmation": true,
  "auto-export": false,
  "auto-export-path": null,
  "export-format": "md",
  "note-item-display": "snippet",
  "window-bounds": { width: 1100, height: 600 },
};

interface AppState {
  activeId: string | null;
  searchQuery: string;
  selectionMode: boolean;
  selectedIds: Set<string>;
}

const STATE_STORE: AppState = {
  activeId: null,
  searchQuery: "",
  selectionMode: false,
  selectedIds: new Set<string>(),
};

let prevId: string | null = null;
let prevSearchQuery: string = "";
let prevVisibleIds: string[] | null = null;
let prevSidebarChange: SidebarChange | null = null;

const stateStore = createStore<AppState>(STATE_STORE);

const settingsStore = createStore<AppSettings>(DEFAULT_STORE);

interface NoteStore {
  notes: NoteListItem[];
  visibleIds: string[];
  noteIndex: Map<string, NoteListItem>;
  activeNote: Note | null;
  sidebarChange: SidebarChange | null;
}

const NOTE_STORE: NoteStore = {
  notes: [],
  visibleIds: [],
  noteIndex: new Map<string, NoteListItem>(),
  activeNote: null,
  sidebarChange: null,
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

stateStore.subscribe((state) => {
  if (state.activeId !== prevId) {
    prevId = state.activeId;
    window.noteAPI.setActiveNote(state.activeId);
    const sidebar = getAppItem("sidebar");
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${state.activeId}"]`,
      sidebar,
    );
    if (noteElement) setActiveItem(noteElement, sidebar);
    handleEditorEmptyState();
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
  loadSettings,
  noteStore,
  searchEngine,
  settingsStore,
  stateStore,
  syncNoteStore,
};
