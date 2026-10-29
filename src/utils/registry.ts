import { initEditor } from "@/components/editor/editor-init";
import { requireElement } from "@/utils/ui";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Editor } from "@tiptap/core";

interface AppRegistry {
  ui: Partial<UIRegistry>;
  core: Partial<CoreRegistry>;
  template: Partial<TemplateRegistry>;
  dialog: Partial<DialogRegistry>;
}

interface CoreRegistry {
  editor: Editor;
  appContainer: HTMLDivElement;
  sidebar: HTMLDivElement;
  sidebarContainer: HTMLDivElement;
  editorWrapper: HTMLDivElement;
  editorContainer: HTMLDivElement;
}

interface UIRegistry {
  wordCountEl: HTMLSpanElement;
  charCountEl: HTMLSpanElement;
  readingTime: HTMLSpanElement;
  searchInput: HTMLInputElement;
  sidebarHeader: HTMLDivElement;
  sidebarFooter: HTMLDivElement;
  selectionFooter: HTMLDivElement;
  quickActionContainer: HTMLDivElement;
}

interface TemplateRegistry {
  // editor empty state template and view
  editorEmptyStateTemplate: HTMLTemplateElement;
  editorView: HTMLDivElement;
  // sidebar empty state template
  sidebarEmptyStateTemplate: HTMLTemplateElement;
  // note item template
  noteItemTemplate: HTMLTemplateElement;
  // tags popover template
  tagsPopoverTemplate: HTMLTemplateElement;
}

interface DialogRegistry {
  // delete dialog
  deleteDialog: HTMLDialogElement;
  // settings dialog
  settingsDialog: HTMLDialogElement;
  settingsContainer: HTMLDivElement;
  // quick switcher dialog
  switchDialog: HTMLDialogElement;
  switchListEl: HTMLDivElement;
  switchListSearchInput: HTMLInputElement;
  // math dialog
  mathDialog: HTMLDialogElement;
  mathInput: HTMLTextAreaElement;
}

type RegistryState = {
  [K in keyof AppRegistry]: Partial<AppRegistry[K]>;
};

// set settings to empty object to avoid undefined errors, will be populated in app.ts on startup
const registry: RegistryState = {
  core: {},
  ui: {},
  template: {},
  dialog: {},
};

function fromRegistry<T extends keyof AppRegistry>(registryKey: T) {
  return function <K extends keyof AppRegistry[T]>(
    ...keys: K[]
  ): Required<Readonly<Pick<AppRegistry[T], K>>> {
    const result = {} as Partial<Pick<AppRegistry[T], K>>;
    const entryObject = registry[registryKey];
    for (const key of keys) {
      const item = entryObject[key];
      if (!item)
        throw new Error(
          `Element "${String(key)}" is missing from the registry.`,
        );
      result[key] = item;
    }
    return result as Required<Readonly<Pick<AppRegistry[T], K>>>;
  };
}

function toRegistry<T extends keyof AppRegistry>(registryKey: T) {
  return function (...entries: readonly AppRegistry[T][]): void {
    Object.assign(registry[registryKey], ...entries);
  };
}

function initCoreRegistry(settings: Readonly<AppSettings>) {
  toRegistry("core")({
    appContainer: requireElement<HTMLDivElement>(".app-container"),
    sidebar: requireElement<HTMLDivElement>(".notes-container"),
    sidebarContainer: requireElement<HTMLDivElement>(".sidebar-container"),
    editor: initEditor(settings),
    editorWrapper: requireElement<HTMLDivElement>("#editor"),
    editorContainer: requireElement<HTMLDivElement>(".editor-container"),
  });
}

function initUIRegistry() {
  toRegistry("ui")({
    wordCountEl: requireElement<HTMLSpanElement>("#word-count"),
    charCountEl: requireElement<HTMLSpanElement>("#char-count"),
    readingTime: requireElement<HTMLSpanElement>("#reading-time"),
    searchInput: requireElement<HTMLInputElement>(".search-input"),
    sidebarHeader: requireElement<HTMLDivElement>(".sidebar-header"),
    sidebarFooter: requireElement<HTMLDivElement>(".sidebar-footer"),
    quickActionContainer: requireElement<HTMLDivElement>(
      ".settings-quick-actions",
    ),
  });
}

function initTemplateRegistry() {
  toRegistry("template")({
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
    tagsPopoverTemplate: requireElement<HTMLTemplateElement>(
      "#tags-popover-template",
    ),
  });
}

function initDialogRegistry() {
  toRegistry("dialog")({
    deleteDialog: requireElement<HTMLDialogElement>("#delete-dialog"),
    settingsContainer: requireElement<HTMLDivElement>(".settings-content"),
    settingsDialog: requireElement<HTMLDialogElement>(".settings-modal"),
    switchDialog: requireElement<HTMLDialogElement>(".quick-switch-dialog"),
    switchListSearchInput: requireElement<HTMLInputElement>(
      ".search-input-quick-switch",
    ),
    switchListEl: requireElement<HTMLDivElement>(".quick-switch-list"),
    mathDialog: requireElement<HTMLDialogElement>(".math-dialog"),
    mathInput: requireElement<HTMLTextAreaElement>("#math-input"),
  });
}

const useCore = fromRegistry("core");
const useUI = fromRegistry("ui");
const useTemplates = fromRegistry("template");
const useDialog = fromRegistry("dialog");

export {
  fromRegistry,
  initCoreRegistry,
  initDialogRegistry,
  initTemplateRegistry,
  initUIRegistry,
  toRegistry,
  useCore,
  useDialog,
  useTemplates,
  useUI,
  type AppRegistry,
  type CoreRegistry,
  type DialogRegistry,
  type TemplateRegistry,
  type UIRegistry,
};
