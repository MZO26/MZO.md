import { DEFAULT_SETTINGS } from "@shared/constants/setting-constants";
import { createLogger } from "@shared/log";
import type { NoteListItem } from "@shared/schemas/note-schema";

interface Store<T> {
  getState: () => Readonly<T>;
  get: <K extends keyof T>(key: K) => Readonly<T[K]>;
  setState: (
    newState: Partial<T> | ((state: Readonly<T>) => Partial<T>),
  ) => void;
  subscribe: (
    listener: (state: Readonly<T>, prevState: Readonly<T>) => void,
  ) => () => void;
  subscribeSel: <S>(
    selector: (state: Readonly<T>) => S,
    listener: (selected: S, previous: S) => void,
    isEqual?: (previous: S, next: S) => boolean,
    options?: { fireImmediately?: boolean },
  ) => () => void;
}

interface AppState {
  activeId: string | null;
  searchQuery: string;
  selectionMode: boolean;
  selectedIds: Set<string>;
  activeTag: string | null;
  focus: boolean;
}

const STATE_STORE: AppState = {
  activeId: null,
  searchQuery: "",
  selectionMode: false,
  selectedIds: new Set<string>(),
  activeTag: null,
  focus: false,
};

interface NoteStore {
  notes: readonly NoteListItem[];
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

// get dev state from vite since state should be independent of main / renderer for using request extensions from editor
const isDev = import.meta.env.DEV;

const stateLogger = createLogger(isDev);

const stateStore = isDev ? withLogger(STATE_STORE_BASE) : STATE_STORE_BASE;

const noteStore = isDev ? withLogger(NOTE_STORE_BASE) : NOTE_STORE_BASE;

const settingsStore = isDev
  ? withLogger(SETTINGS_STORE_BASE)
  : SETTINGS_STORE_BASE;

function keysOf<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

function createStore<T extends object>(initialState: T): Store<T> {
  let isUpdating = false;
  let state = { ...initialState };
  const listeners = new Set<
    (state: Readonly<T>, prevState: Readonly<T>) => void
  >();
  function getState(): Readonly<T> {
    return state;
  }
  function get<K extends keyof T>(key: K): Readonly<T[K]> {
    return state[key];
  }
  function notify(prevState: Readonly<T>) {
    const snapshot = [...listeners];
    snapshot.forEach((listener) => {
      try {
        listener(state, prevState);
      } catch (error) {
        stateLogger.appError("[store] listener failed", error);
      }
    });
  }
  function setState(
    newState: Partial<T> | ((state: Readonly<T>) => Partial<T>),
  ) {
    if (isUpdating) {
      throw new Error("Called setState inside listener");
    }
    const update = typeof newState === "function" ? newState(state) : newState;
    if (!update || Object.keys(update).length === 0) return;
    let hasChanged = false;
    for (const key of keysOf(update)) {
      if (!Object.is(state[key], update[key])) {
        hasChanged = true;
        break;
      }
    }
    if (!hasChanged) return;
    const prevState = state;
    state = { ...state, ...update };
    isUpdating = true;
    try {
      notify(prevState);
    } finally {
      isUpdating = false;
    }
  }
  function subscribe(
    listener: (state: Readonly<T>, prevState: Readonly<T>) => void,
  ) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function subscribeSel<S>(
    selector: (state: Readonly<T>) => S,
    listener: (selected: S, previous: S) => void,
    isEqual: (previous: S, next: S) => boolean = Object.is,
    options?: { fireImmediately?: boolean },
  ) {
    let previousSelected = selector(state);
    if (options?.fireImmediately) {
      listener(previousSelected, previousSelected);
    }
    return subscribe((state) => {
      const nextSelected = selector(state);
      if (isEqual(previousSelected, nextSelected)) return;
      const prev = previousSelected;
      previousSelected = nextSelected;
      listener(nextSelected, prev);
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
    stateLogger.groupCollapsed(`[store update]`);
    stateLogger.stateLog(
      "color: #4caf50; font-weight: bold",
      "Update:",
      resolvedUpdate,
    );
    originalSetState(resolvedUpdate);
    const nextState = store.getState();
    stateLogger.stateLog(
      "color: #2196f3; font-weight: bold",
      "Next State:",
      nextState,
    );
    stateLogger.groupEnd();
  };
  return {
    ...store,
    setState: loggedSetState,
  };
}

export { noteStore, settingsStore, stateStore, type AppState, type NoteStore };
