const StorageKeys = {
  THEME: "theme",
  NOTE_ID: "noteId",
} as const;

interface StorageData {
  [StorageKeys.THEME]: "light" | "dark" | "system";
  [StorageKeys.NOTE_ID]: string | null;
}

const defaultValues: StorageData = {
  [StorageKeys.THEME]: "system",
  [StorageKeys.NOTE_ID]: null,
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
