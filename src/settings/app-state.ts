import { getAllSettings } from "@/api/api";
import { updateNoteCount } from "@/components/sidebar/sidebar-actions";
import type { Note } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";

const DEFAULT_STORE: AppSettings = {
  theme: "system",
  "font-family": "system",
  "font-size": "16",
  "line-height": "1.5",
  "editor-focus": "off",
  "code-theme": "balanced",
  highlight: "done",
  spellcheck: false,
  "note-item-display": "tags",
  "window-bounds": { width: 1100, height: 600 },
};

interface AppState {
  activeId: string | null;
}

const STATE_STORE: AppState = {
  activeId: null,
};

let previousId: string | null = null;
let previousNotesLength: number | null = null;

const stateStore = createStore<AppState>(STATE_STORE);

const settingsStore = createStore<AppSettings>(DEFAULT_STORE);

interface NoteStore {
  notes: Note[];
}

const NOTE_STORE: NoteStore = {
  notes: [],
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
  const response = await getAllSettings();
  if (response.success) {
    settingsStore.setState(response.data);
  }
  return settingsStore.getState();
}

stateStore.subscribe((state) => {
  if (state.activeId !== previousId) {
    previousId = state.activeId;
    window.noteAPI.setActiveNote(state.activeId);
  }
});

noteStore.subscribe((state) => {
  if (state.notes.length !== previousNotesLength) {
    previousNotesLength = state.notes.length;
    updateNoteCount(state.notes);
  }
});

export { loadSettings, noteStore, settingsStore, stateStore };
