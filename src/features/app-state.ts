import { getAllSettings } from "@/api/settingsAPI";
import type { AppSettings } from "@shared/schemas/store-schema";

const DEFAULT_STORE: AppSettings = {
  theme: "system",
  "font-family": "system",
  "font-size": "16",
  "line-height": "1.5",
  "code-theme": "balanced",
  highlight: "done",
  "note-sidebar-state": false,
  "info-sidebar-state": false,
  "open-window-mode": "centered",
  "close-window-mode": "normal",
  "minimize-window-mode": "taskbar",
  "window-bounds": { width: 1100, height: 600 },
  "mirror-mode": "db",
  "mirror-path": null,
};

interface AppState {
  activeId: string | null;
}

const STATE_STORE: AppState = {
  activeId: null,
};

let previousId: string | null = null;

const stateStore = createStore<AppState>(STATE_STORE);

const settingsStore = createStore<AppSettings>(DEFAULT_STORE);

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

export { loadSettings, settingsStore, stateStore };
