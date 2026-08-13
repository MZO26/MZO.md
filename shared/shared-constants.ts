import type { AppSettings } from "@shared/schemas/store-schema";

const MAX_BYTES_FILE = 3 * 1024 * 1024;

const MAX_CHARACTERS = 3_500_000;

const MAX_SEARCH_LENGTH = 100;

const MIN_SEARCH_LENGTH = 2;

const UNTITLED = "Untitled";

const EMPTY_DOC = {
  type: "doc" as const,
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
    },
  ],
};

const ALLOWED_PROTOCOLS = ["https:", "http:", "appimg:", "file:"];

const SETTINGS_CATEGORIES = ["Appearance", "Editor", "General"] as const;

const ALLOWED_IMPORT_EXTENSIONS = ["md", "html", "json", "txt"] as const;

const SIDEBAR_FILTER_MODES = ["recent", "search", "tag"] as const;

const TABLE_ACTIONS = {
  ADD_ROW_BEFORE: "addRowBefore",
  ADD_ROW_AFTER: "addRowAfter",
  ADD_COLUMN_BEFORE: "addColumnBefore",
  ADD_COLUMN_AFTER: "addColumnAfter",
  DELETE_ROW: "deleteRow",
  DELETE_COLUMN: "deleteColumn",
  DELETE_TABLE: "deleteTable",
} as const;

const APP_EVENTS = {
  TOGGLE_EDITOR_SEARCH: "app:toggle-editor-search",
  TOGGLE_QUICK_SWITCH: "app:toggle-quick-switch",
  TOGGLE_SIDEBAR: "app:toggle-sidebar",
  CREATE_NEW_NOTE: "app:create-new-note",
  FOCUS_GLOBAL_SEARCH: "app:focus-global-search",
  SET_SELECTION_MODE: "app:set-selection-mode",
  EXIT_SELECTION_MODE: "app:exit-selection-mode",
  DELETE_SELECTED: "app:delete-selected",
  SELECT_ALL_VISIBLE: "app:select-all-visible",
  REFRESH_TOOLBAR: "app:refresh-toolbar",
  SET_EDITOR_WIDTH: "app:set-editor-width",
  TOGGLE_FOCUS_MODE: "app:toggle-focus-mode",
  TOGGLE_TOOLBAR: "app:toggle-toolbar",
  OPEN_SETTINGS: "app:open-settings",
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  font_family: "system",
  font_size: "18",
  line_height: "1.5",
  spellcheck: false,
  auto_export: false,
  auto_export_path: null,
  export_format: "md",
  code_theme: "balanced",
  highlight: "context",
  note_item_display: "preview",
  toolbar_collapsed: false,
  window_bounds: { width: 800, height: 500 },
  active_tag: null,
};

export {
  ALLOWED_IMPORT_EXTENSIONS,
  ALLOWED_PROTOCOLS,
  APP_EVENTS,
  DEFAULT_SETTINGS,
  EMPTY_DOC,
  MAX_BYTES_FILE,
  MAX_CHARACTERS,
  MAX_SEARCH_LENGTH,
  MIN_SEARCH_LENGTH,
  SETTINGS_CATEGORIES,
  SIDEBAR_FILTER_MODES,
  TABLE_ACTIONS,
  UNTITLED,
};
