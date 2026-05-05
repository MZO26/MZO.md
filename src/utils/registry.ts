import type { Editor } from "@tiptap/core";

interface AppRegistry {
  editor: Editor;
  appContainer: HTMLDivElement;
  sidebar: HTMLDivElement;
  editorWrapper: HTMLDivElement;
}

const registry: Partial<AppRegistry> = {};

function setItems(items: Partial<AppRegistry>): void {
  Object.assign(registry, items);
}

function setItem<K extends keyof AppRegistry>(
  key: K,
  value: AppRegistry[K],
): void {
  registry[key] = value;
}

function getItem<K extends keyof AppRegistry>(key: K): AppRegistry[K] {
  const value = registry[key];

  if (value === undefined) {
    throw new Error(`Registry item not found: "${String(key)}"`);
  }
  return value;
}

export { getItem, setItem, setItems, type AppRegistry };
