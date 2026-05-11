import type { Editor } from "@tiptap/core";

interface AppRegistry {
  settings?: Partial<SettingsRegistry>;
  editor: Editor;
  appContainer: HTMLDivElement;
  sidebar: HTMLDivElement;
  editorWrapper: HTMLDivElement;
}

type SettingsKeys =
  | "themeSelect"
  | "codeThemeSelect"
  | "highlightSelect"
  | "fontFamilySelect"
  | "fontSizeSelect"
  | "lineHeightSelect"
  | "openWindowSelect"
  | "closeWindowSelect"
  | "minimizeWindowSelect"
  | "mirrorModeSelect";

interface SettingsRegistry extends Record<SettingsKeys, HTMLSelectElement> {}

const registry = {} as AppRegistry;

export function setAppItem<K extends keyof Omit<AppRegistry, "settings">>(
  key: K,
  value: AppRegistry[K],
): void;

export function setAppItem(items: Partial<Omit<AppRegistry, "settings">>): void;

export function setAppItem(first: any, second?: any): void {
  if (typeof first === "string") {
    registry[first as keyof AppRegistry] = second;
  } else {
    Object.assign(registry, first);
  }
}

export function setSettingsItem<K extends keyof SettingsRegistry>(
  key: K,
  value: SettingsRegistry[K],
): void;
export function setSettingsItem(items: Partial<SettingsRegistry>): void;
export function setSettingsItem(first: any, second?: any): void {
  if (!registry.settings) registry.settings = {};
  if (typeof first === "string") {
    (registry.settings as any)[first] = second;
  } else {
    Object.assign(registry.settings, first);
  }
}

export function getAppItem<K extends keyof Omit<AppRegistry, "settings">>(
  key: K,
): AppRegistry[K];
export function getAppItem(): Omit<AppRegistry, "settings">;
export function getAppItem(key?: any): any {
  if (key) return registry[key as keyof AppRegistry];
  return registry as Omit<AppRegistry, "settings">;
}

export function getSettingsItem<K extends keyof SettingsRegistry>(
  key: K,
): SettingsRegistry[K];
export function getSettingsItem(): SettingsRegistry;
export function getSettingsItem(key?: any): any {
  if (!registry.settings) throw new Error("Failed to init setttings registry");
  if (key) return (registry.settings as any)[key];
  return registry.settings as SettingsRegistry;
}

function registerAppEvents(
  target: EventTarget,
  events: Record<string, EventListener>,
) {
  Object.entries(events).forEach(([eventName, handler]) => {
    target.addEventListener(eventName, handler);
  });
  return function cleanup() {
    Object.entries(events).forEach(([eventName, handler]) => {
      target.removeEventListener(eventName, handler);
    });
  };
}

export { registerAppEvents, type AppRegistry, type SettingsRegistry };
