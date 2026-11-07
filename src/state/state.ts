import { createLogger } from "@shared/log";
import type { Id, NoteListItem } from "@shared/schemas/note-schema";
import { DEFAULT_SETTINGS } from "@shared/shared-constants";

/** localStorage key under which the persisted app state is stored. */
const STORAGE_KEY = "app_store";

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
  activeId: Id | null;
  isDirty: boolean;
  searchQuery: string;
  selectionMode: boolean;
  selectedIds: Set<Id>;
  hoverId: Id | null;
  activeTag: string | null;
  focus: boolean;
}

const STATE_STORE: Readonly<AppState> = {
  activeId: null,
  isDirty: false,
  searchQuery: "",
  selectionMode: false,
  selectedIds: new Set<Id>(),
  hoverId: null,
  activeTag: null,
  focus: false,
};

interface LocalStore {
  cursorPos: Record<Id, number>;
  scrollTop: Record<Id, number>;
  sidebarWidth: number;
  toolbarCollapsed: boolean;
  sidebarCollapsed: boolean;
  lastOpenNote: Id | null;
}

const LOCAL_STORE: Readonly<LocalStore> = {
  cursorPos: {},
  scrollTop: {},
  sidebarWidth: 320,
  toolbarCollapsed: false,
  sidebarCollapsed: false,
  lastOpenNote: null,
};

interface NoteStore {
  notes: readonly NoteListItem[];
  visibleIds: Id[];
  noteIndex: Map<Id, NoteListItem>;
  recentNotes: Id[];
  searchSnippets: Record<Id, string>;
}

const NOTE_STORE: Readonly<NoteStore> = {
  notes: [],
  visibleIds: [],
  noteIndex: new Map<Id, NoteListItem>(),
  recentNotes: [],
  searchSnippets: {},
};

const STATE_STORE_BASE = createStore(STATE_STORE);
const NOTE_STORE_BASE = createStore(NOTE_STORE);
const SETTINGS_STORE_BASE = createStore(DEFAULT_SETTINGS);
const LOCAL_STORE_BASE = createStore(LOCAL_STORE);

// get dev state from vite since state should be independent of main / renderer for using request extensions from editor
const isDev = import.meta.env.DEV;

/** Logger dedicated to store/state operations (dev-aware). */

const stateLogger = createLogger(isDev);

const stateStore = isDev ? withLogger(STATE_STORE_BASE) : STATE_STORE_BASE;

const noteStore = isDev ? withLogger(NOTE_STORE_BASE) : NOTE_STORE_BASE;

const settingsStore = isDev
  ? withLogger(SETTINGS_STORE_BASE)
  : SETTINGS_STORE_BASE;

const localStore = isDev
  ? withLogger(withStorage(LOCAL_STORE_BASE, STORAGE_KEY))
  : withStorage(LOCAL_STORE_BASE, STORAGE_KEY);

/**
 * Typed wrapper around `Object.keys`.
 *
 * @param obj - The object to read keys from.
 * @returns An array of the object's own string keys.
 *
 * @example
 * keysOf({ a: 1, b: "x" }); // ["a", "b"]
 */

function keysOf<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

function createStore<T extends Record<string, unknown>>(
  initialState: T,
): Store<T> {
  let isUpdating = false;
  let state = { ...initialState };
  const listeners = new Set<
    (state: Readonly<T>, prevState: Readonly<T>) => void
  >();

  /**
   * Returns the current state snapshot (read-only reference).
   *
   * @returns The current state object.
   */

  function getState(): Readonly<T> {
    return state;
  }

  /**
   * Reads a single key from the current state.
   *
   * @param key - The state property to read.
   * @returns The value stored under `key`.
   *
   * @example
   * store.get("theme"); // "dark"
   */

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

  /**
   * Partially updates the state and notifies all subscribers.
   *
   * Accepts either a plain object or an updater function. The update is
   * shallow-merged into the current state. No-op if no value actually
   * changed (compared via `Object.is`).
   *
   * @param newState - Partial update object, or a function receiving the current state and returning a partial update.
   * @throws If called from within a listener (re-entrancy guard).
   *
   * @example
   * store.setState({ theme: "light" });
   * store.setState((s) => ({ count: s.count + 1 }));
   */

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

  /**
   * Registers a listener that fires on every state change.
   *
   * @param listener - Called with the new and previous state.
   * @returns An unsubscribe function.
   *
   * @example
   * const off = store.subscribe((state, prev) => console.log(state));
   * off(); // unsubscribe
   */

  function subscribe(
    listener: (state: Readonly<T>, prevState: Readonly<T>) => void,
  ) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Registers a selector-based listener that only fires when the selected
   * slice changes.
   *
   * @param selector - Extracts the relevant slice from the full state.
   * @param listener - Called with the new and previous selected value.
   * @param isEqual - Custom equality check for the selected slice; defaults to `Object.is`.
   * @param options.fireImmediately – If `true`, invokes the listener once on subscription with the current value.
   * @returns An unsubscribe function.
   *
   * @example
   * const off = store.subscribeSel(
   *   (s) => s.theme,
   *   (theme, prev) => applyTheme(theme),
   * );
   */

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

/**
 * Wraps a store with localStorage persistence.
 *
 * On initialization, hydrates the store from `localStorage` if a saved
 * snapshot exists. After every `setState` call, serializes the full state
 * back to storage. Read/write errors are logged and swallowed (non-fatal).
 *
 * The original store is not mutated; a new store object with the wrapped
 * `setState` is returned.
 *
 * @param store - The base store to persist.
 * @param key - The localStorage key under which the state is stored.
 * @returns A new store with persistence built into `setState`.
 *
 * @example
 * const themeStore = withStorage(createStore({ theme: "dark" }), STORAGE_KEY.THEME);
 */

function withStorage<T extends Record<string, unknown>>(
  store: Store<T>,
  key: typeof STORAGE_KEY,
): Store<T> {
  const originalSetState = store.setState;
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        originalSetState({ ...store.getState(), ...parsed });
      }
    }
  } catch (error) {
    stateLogger.devLog(
      `Failed to update store "${key}" from localStorage:`,
      error,
    );
  }
  const storedSetState: Store<T>["setState"] = (newState) => {
    originalSetState(newState);
    try {
      if (typeof window !== "undefined") {
        const currentState = store.getState();
        localStorage.setItem(key, JSON.stringify(currentState));
      }
    } catch (error) {
      stateLogger.devLog(
        `Failed to persist store "${key}" to localStorage:`,
        error,
      );
    }
  };
  return {
    ...store,
    setState: storedSetState,
  };
}

/**
 * Wraps a store with dev-logging around every `setState` call.
 *
 * Logs the resolved update and the resulting full state in a collapsed
 * console group (`[store update]`). The original store is not mutated.
 *
 * @param store - The base store to instrument.
 * @returns A new store with logging built into `setState`.
 *
 * @example
 * const themeStore = withLogger(createStore({ theme: "dark" }));
 */

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

/**
 * Shallow structural equality check (one level deep).
 *
 * - Primitives: compared via {@link Object.is} (handles `NaN`, `-0`).
 * - `Map` / `Set`: same size + every entry present in both.
 * - Arrays / plain objects: same key count, every own key present in both
 *   with values equal via `Object.is` (i.e. nested structures compared by reference).
 *
 * Unlike a simple `===`, this distinguishes structurally equal objects
 * (`{a:1}` vs `{a:1}`) while remaining O(n) and allocation-free.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` if both values are shallowly equal.
 *
 * @example
 * shallowEq({ x: 1 }, { x: 1 });           // true
 * shallowEq(new Set([1, 2]), new Set([1, 2])); // true
 * shallowEq([1, obj], [1, obj]);           // true (same reference)
 * shallowEq([1, { a: 1 }], [1, { a: 1 }]); // false (different references)
 */

function shallowEq<A>(a: A, b: A): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !Object.is(value, b.get(key))) return false;
    }
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }
  const keysA = Object.keys(a) as Array<keyof A>;
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(a[key], b[key])
    ) {
      return false;
    }
  }
  return true;
}

export {
  localStore,
  noteStore,
  settingsStore,
  shallowEq,
  stateStore,
  type AppState,
};
