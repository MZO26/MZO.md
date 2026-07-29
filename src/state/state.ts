import { appError, DEFAULT_SETTINGS, DEV, devLog } from "@shared/constants";
import type { NoteListItem } from "@shared/schemas/note-schema";

interface Store<T> {
  getState: () => Readonly<T>;
  get: <K extends keyof T>(key: K) => Readonly<T[K]>;
  setState: (newState: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: (state: T) => void) => () => void;
  subscribeSel: <S>(
    selector: (state: T) => S,
    listener: (selected: S) => void,
    isEqual?: (previous: S, next: S) => boolean,
  ) => () => void;
}

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
  searchSnippets: Record<string, string>;
}

const NOTE_STORE: NoteStore = {
  notes: [],
  visibleIds: [],
  noteIndex: new Map<string, NoteListItem>(),
  recentNotes: [],
  searchSnippets: {},
};

const STATE_STORE_BASE = createStore(STATE_STORE);
const NOTE_STORE_BASE = createStore(NOTE_STORE);
const SETTINGS_STORE_BASE = createStore(DEFAULT_SETTINGS);

const stateStore = DEV ? withLogger(STATE_STORE_BASE) : STATE_STORE_BASE;

const noteStore = DEV ? withLogger(NOTE_STORE_BASE) : NOTE_STORE_BASE;

const settingsStore = DEV
  ? withLogger(SETTINGS_STORE_BASE)
  : SETTINGS_STORE_BASE;

function createStore<T extends object>(initialState: T): Store<T> {
  let isUpdating = false;
  let pendingNotify = false;
  let state = { ...initialState };
  const listeners = new Set<(state: T) => void>();
  function getState(): Readonly<T> {
    return state;
  }
  function get<K extends keyof T>(key: K): Readonly<T[K]> {
    return state[key];
  }
  function notify() {
    const snapshot = [...listeners];
    snapshot.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        appError("[store] listener failed", error);
      }
    });
  }
  function scheduleNotify() {
    if (pendingNotify) return;
    pendingNotify = true;
    queueMicrotask(() => {
      pendingNotify = false;
      notify();
    });
  }
  function setState(newState: Partial<T> | ((state: T) => Partial<T>)) {
    if (isUpdating) {
      throw new Error("Called setState inside listener");
    }
    const update = typeof newState === "function" ? newState(state) : newState;
    if (!update || Object.keys(update).length === 0) return;
    let hasChanged = false;
    for (const key of Object.keys(update) as Array<keyof T>) {
      if (!Object.is(state[key], update[key])) {
        hasChanged = true;
        break;
      }
    }
    if (!hasChanged) return;
    isUpdating = true;
    try {
      state = { ...state, ...update };
      scheduleNotify();
    } finally {
      isUpdating = false;
    }
  }
  function subscribe(listener: (state: T) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function subscribeSel<S>(
    selector: (state: T) => S,
    listener: (selected: S) => void,
    isEqual: (previous: S, next: S) => boolean = Object.is,
  ) {
    let previousSelected = selector(state);
    return subscribe((state) => {
      const nextSelected = selector(state);
      if (isEqual(previousSelected, nextSelected)) return;
      previousSelected = nextSelected;
      listener(nextSelected);
    });
  }
  return { getState, get, setState, subscribe, subscribeSel };
}

function withLogger<T extends object>(store: Store<T>): Store<T> {
  const originalSetState = store.setState;
  const loggedSetState: Store<T>["setState"] = (newState) => {
    const prevState = store.getState();
    const resolvedUpdate =
      typeof newState === "function" ? newState(prevState) : newState;
    console.groupCollapsed(`[store update]`);
    devLog("%cUpdate:", "color: #4caf50", resolvedUpdate);
    originalSetState(resolvedUpdate);
    const nextState = store.getState();
    devLog("%cNext State:", "color: #2196f3", nextState);
    console.groupEnd();
  };
  return {
    ...store,
    setState: loggedSetState,
  };
}

export { noteStore, settingsStore, stateStore, type AppState, type NoteStore };
