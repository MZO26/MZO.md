import { NoteSearch } from "@/notes/search";
import { DEFAULT_SETTINGS } from "@shared/constants";
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

export {
  noteStore,
  searchEngine,
  settingsStore,
  stateStore,
  type AppState,
  type NoteStore,
};
