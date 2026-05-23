import type {
  AppRegistry,
  SettingsKeys,
  SettingsRegistry,
} from "@shared/types";

// set settings to empty object to avoid undefined errors, will be populated in app.ts on startup
const registry = { settings: {} } as AppRegistry;

const setAppItems = (obj: Partial<AppRegistry>) => {
  Object.assign(registry, obj);
};

const getAppItem = <K extends keyof AppRegistry>(key: K) => {
  return registry[key];
};

const setSettingsItems = (obj: Partial<SettingsRegistry>) => {
  if (!registry.settings) registry.settings = {};
  Object.assign(registry.settings, obj);
};

const getSettingsItem = <K extends SettingsKeys>(key: K) => {
  return registry.settings[key] as HTMLSelectElement;
};

function registerAppEvents(
  target: EventTarget,
  events: Record<string, EventListener>,
) {
  for (const [eventName, handler] of Object.entries(events)) {
    target.addEventListener(eventName, handler);
  }
}

export {
  getAppItem,
  getSettingsItem,
  registerAppEvents,
  setAppItems,
  setSettingsItems,
  type AppRegistry,
  type SettingsRegistry,
};
