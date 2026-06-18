import { initEditor } from "@/components/editor/editor-init";
import { requireElement } from "@/utils/dom";
import type { AppSettings } from "@shared/schemas/store-schema";
import type {
  AppRegistry,
  CoreRegistry,
  StatRegistry,
  TemplateRegistry,
} from "@shared/types";

// set settings to empty object to avoid undefined errors, will be populated in app.ts on startup
const registry = {
  core: {},
  stats: {},
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

const setStatItems = (obj: Partial<StatRegistry>) => {
  if (!registry.stats) registry.stats = {};
  Object.assign(registry.stats, obj);
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

const getStatItem = <K extends keyof StatRegistry>(key: K): StatRegistry[K] => {
  const item = registry.stats[key];
  if (!item) {
    throw new Error(`Element "${key}" is missing from the registry.`);
  }
  return item;
};

const getStatItems = <K extends keyof StatRegistry>(
  keys: K[],
): Pick<StatRegistry, K> => {
  const result = {} as Pick<StatRegistry, K>;
  for (const key of keys) {
    const item = registry.stats[key];
    if (!item) {
      throw new Error(`Element "${key}" is missing from the registry.`);
    }
    result[key] = item;
  }
  return result;
};

function registerAppEvents(
  target: EventTarget,
  events: Record<string, EventListener>,
) {
  for (const eventName in events) {
    const handler = events[eventName];
    if (!handler) continue;
    target.addEventListener(eventName, handler);
  }
}

function initializeCoreRegistry(settings: AppSettings) {
  setAppItems({
    appContainer: requireElement<HTMLDivElement>(".app-container"),
    sidebar: requireElement<HTMLDivElement>(".notes-container"),
    editor: initEditor(settings),
    editorWrapper: requireElement<HTMLDivElement>("#editor"),
    editorContainer: requireElement<HTMLDivElement>(".editor-container"),
  });
}

function initializeStatRegistry() {
  setStatItems({
    wordCountEl: requireElement<HTMLSpanElement>("#word-count"),
    charCountEl: requireElement<HTMLSpanElement>("#char-count"),
    readingTime: requireElement<HTMLSpanElement>("#reading-time"),
    metadataContainer: requireElement<HTMLDivElement>(".metadata-container"),
  });
}

function initializeTemplateRegistry() {
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
  getStatItem,
  getStatItems,
  getTemplateItem,
  getTemplateItems,
  initializeCoreRegistry,
  initializeStatRegistry,
  initializeTemplateRegistry,
  registerAppEvents,
  setAppItems,
  setStatItems,
  type AppRegistry,
};
