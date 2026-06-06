import { getAll, getAllSettings } from "@/api/api";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { updateLinksOption } from "@/components/sidebar/sidebar-features";
import { handleSidebarChange } from "@/components/sidebar/sidebar-note-items";
import {
  handleSidebarEmptyState,
  updateNoteCount,
} from "@/components/sidebar/sidebar-ui";
import { NoteSearch } from "@/notes/search";
import { findElement, setActiveItem } from "@/utils/dom";
import { compareNotes } from "@/utils/note";
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
  "mirror-mode": false,
  "mirror-path": null,
  "note-item-display": "snippet",
  "window-bounds": { width: 1100, height: 600 },
};

interface AppState {
  activeId: string | null;
  searchQuery: string;
  lastSyncedAt: number;
}

const STATE_STORE: AppState = {
  activeId: null,
  searchQuery: "",
  lastSyncedAt: 0,
};

let previousId: string | null = null;
let previousSearchQuery: string = "";
let previousNotesRef: NoteListItem[] = [];
let previousNotesLength: number | null = null;
let previousSidebarChange: SidebarChange = null;
let previousSync: number = 0;

const stateStore = createStore<AppState>(STATE_STORE);

const settingsStore = createStore<AppSettings>(DEFAULT_STORE);

interface NoteStore {
  notes: NoteListItem[];
  activeNote: Note | null;
  sidebarChange: SidebarChange;
}

const NOTE_STORE: NoteStore = {
  notes: [],
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
      sidebarChange: { type: "reload" },
    });
    searchEngine.bulkLoad(sortedNotes);
  }
}

stateStore.subscribe((state) => {
  if (state.activeId !== previousId) {
    previousId = state.activeId;
    window.noteAPI.setActiveNote(state.activeId);
    const sidebar = getAppItem("sidebar");
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${state.activeId}"]`,
      sidebar,
    );
    if (noteElement) setActiveItem(noteElement, sidebar);
    handleEditorEmptyState();
    updateLinksOption(state.activeId);
  }
  if (state.searchQuery !== previousSearchQuery) {
    previousSearchQuery = state.searchQuery;
    requestAnimationFrame(() => {
      handleSidebarEmptyState();
    });
  }
  if (state.lastSyncedAt !== previousSync) {
    previousSync = state.lastSyncedAt;
  }
});

const searchEngine = new NoteSearch(noteStore.getState().notes);

noteStore.subscribe((state) => {
  if (state.notes !== previousNotesRef) {
    previousNotesRef = state.notes;
    handleSidebarEmptyState();
  }
  if (state.notes.length !== previousNotesLength) {
    previousNotesLength = state.notes.length;
    updateNoteCount(state.notes);
  }
  if (state.sidebarChange !== previousSidebarChange) {
    const change = state.sidebarChange;
    previousSidebarChange = change;
    if (change) {
      handleSidebarChange(change, state.notes);
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
