import type { SavedPosition } from "../shared/types";

const StorageKeys = {
  NOTE_ID: "noteID",
  SIDEBAR_STATE: "sidebarState",
  ZOOM_LEVEL: "zoomLevel",
  EDITOR_POS: "editorPos",
  SORT_ORDER: "sortOrder",
} as const;

interface StorageData {
  [StorageKeys.NOTE_ID]: string | null;
  [StorageKeys.SIDEBAR_STATE]: boolean;
  [StorageKeys.ZOOM_LEVEL]: number;
  [StorageKeys.EDITOR_POS]: Record<string, SavedPosition>;
  [StorageKeys.SORT_ORDER]: string;
}

const defaultValues: StorageData = {
  [StorageKeys.NOTE_ID]: null,
  [StorageKeys.SIDEBAR_STATE]: true,
  [StorageKeys.ZOOM_LEVEL]: 100,
  [StorageKeys.EDITOR_POS]: {},
  [StorageKeys.SORT_ORDER]: "",
};

type StorageKey = keyof StorageData;

const cache: Partial<StorageData> = {};
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

function getValue<K extends StorageKey>(key: K): StorageData[K] {
  if (cache[key] !== undefined) {
    return cache[key] as StorageData[K];
  }
  const raw = localStorage.getItem(key);
  if (!raw) return defaultValues[key];
  try {
    const parsed = JSON.parse(raw) as StorageData[K];
    cache[key] = parsed;
    return parsed;
  } catch (err) {
    console.error(`Error parsing "${key}" from localStorage`, err);
    return defaultValues[key];
  }
}

function setValue<K extends StorageKey>(
  key: K,
  value: StorageData[K],
  delay = 100,
) {
  if (cache[key] === value) return;
  cache[key] = value;
  if (timers[key]) {
    clearTimeout(timers[key]);
  }
  timers[key] = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error while saving "${key}" to localStorage`, err);
    }
    delete timers[key];
  }, delay);
}

function removeValue<K extends StorageKey>(key: K): void {
  delete cache[key];
  if (timers[key]) {
    clearTimeout(timers[key]);
    delete timers[key];
  }
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Error while removing "${key}" from localStorage`, err);
  }
}

function updateStorage<K extends keyof StorageData>(
  key: K,
  updater: (currentData: StorageData[K]) => StorageData[K],
): StorageData[K] {
  const currentData = getValue(key);
  const newData = updater(currentData);
  setValue(key, newData);
  return newData;
}

export { getValue, removeValue, setValue, StorageKeys, updateStorage };
