import { initEditor } from "@/components/editor/editor-init";
import { requireElement } from "@/utils/dom";
import type {
  AppEvents,
  AppRegistry,
  CoreRegistry,
  TemplateRegistry,
  UIRegistry,
} from "@/utils/types";
import type { AppSettings } from "@shared/schemas/store-schema";

// set settings to empty object to avoid undefined errors, will be populated in app.ts on startup
const registry = {
  core: {},
  ui: {},
  template: {},
} as AppRegistry;

const setAppItems = (obj: Partial<CoreRegistry>) => {
  if (!registry.core) registry.core = {};
  Object.assign(registry.core, obj);
};

const getAppItem = <K extends keyof CoreRegistry>(key: K): CoreRegistry[K] => {
  const item = registry.core[key];
  if (!item) {
    throw new Error(`Element "${key}" is missing from the registry.`);
  }
  return item;
};

const setUIItems = (obj: Partial<UIRegistry>) => {
  if (!registry.ui) registry.ui = {};
  Object.assign(registry.ui, obj);
};

const setTemplateItems = (obj: Partial<TemplateRegistry>) => {
  if (!registry.template) registry.template = {};
  Object.assign(registry.template, obj);
};

const getTemplateItems = <K extends keyof TemplateRegistry>(
  keys: K[],
): Pick<TemplateRegistry, K> => {
  const result = {} as Pick<TemplateRegistry, K>;
  for (const key of keys) {
    const item = registry.template[key];
    if (!item) {
      throw new Error(`Element "${key}" is missing from the registry.`);
    }
    result[key] = item;
  }
  return result;
};

const getTemplateItem = <K extends keyof TemplateRegistry>(
  key: K,
): TemplateRegistry[K] => {
  const item = registry.template[key];
  if (!item) {
    throw new Error(`Element "${key}" is missing from the registry.`);
  }
  return item;
};

const getUIItem = <K extends keyof UIRegistry>(key: K): UIRegistry[K] => {
  const item = registry.ui[key];
  if (!item) {
    throw new Error(`Element "${key}" is missing from the registry.`);
  }
  return item;
};

const getAppItems = <K extends keyof CoreRegistry>(
  keys: K[],
): Pick<CoreRegistry, K> => {
  const result = {} as Pick<CoreRegistry, K>;
  for (const key of keys) {
    const item = registry.core[key];
    if (!item) {
      throw new Error(`Element "${key}" is missing from the registry.`);
    }
    result[key] = item;
  }
  return result;
};

const getUIItems = <K extends keyof UIRegistry>(
  keys: K[],
): Pick<UIRegistry, K> => {
  const result = {} as Pick<UIRegistry, K>;
  for (const key of keys) {
    const item = registry.ui[key];
    if (!item) {
      throw new Error(`Element "${key}" is missing from the registry.`);
    }
    result[key] = item;
  }
  return result;
};

function registerAppEvents(
  target: EventTarget,
  events: Partial<Record<AppEvents, EventListener>>,
) {
  // ts only infers string from for in loop / object.keys (structural typing)
  // so cast as AppEvents is necessary
  for (const eventName in events) {
    const handler = events[eventName as AppEvents];
    if (!handler) continue;
    target.addEventListener(eventName, handler);
  }
}

function initCoreRegistry(settings: AppSettings) {
  setAppItems({
    appContainer: requireElement<HTMLDivElement>(".app-container"),
    sidebar: requireElement<HTMLDivElement>(".notes-container"),
    sidebarContainer: requireElement<HTMLDivElement>(".sidebar-container"),
    editor: initEditor(settings),
    editorWrapper: requireElement<HTMLDivElement>("#editor"),
    editorContainer: requireElement<HTMLDivElement>(".editor-container"),
  });
}

function initUIRegistry() {
  setUIItems({
    wordCountEl: requireElement<HTMLSpanElement>("#word-count"),
    charCountEl: requireElement<HTMLSpanElement>("#char-count"),
    readingTime: requireElement<HTMLSpanElement>("#reading-time"),
    searchInput: requireElement<HTMLInputElement>(".search-input"),
    sidebarHeader: requireElement<HTMLDivElement>(".sidebar-header"),
    sidebarFooter: requireElement<HTMLDivElement>(".sidebar-footer"),
    selectionFooter: requireElement<HTMLDivElement>(
      ".sidebar-selection-footer",
    ),
    quickActionContainer: requireElement<HTMLDivElement>(
      ".settings-quick-actions",
    ),
  });
}

function initTemplateRegistry() {
  setTemplateItems({
    editorEmptyStateTemplate: requireElement<HTMLTemplateElement>(
      "#editor-empty-state-template",
    ),
    editorView: requireElement<HTMLDivElement>(".editor-view"),
    sidebarEmptyStateTemplate: requireElement<HTMLTemplateElement>(
      "#sidebar-empty-state-template",
    ),
    noteItemTemplate: requireElement<HTMLTemplateElement>(
      "#note-item-template",
    ),
  });
}

export {
  getAppItem,
  getAppItems,
  getTemplateItem,
  getTemplateItems,
  getUIItem,
  getUIItems,
  initCoreRegistry,
  initTemplateRegistry,
  initUIRegistry,
  registerAppEvents,
  setAppItems,
  setUIItems,
  type AppRegistry,
};
