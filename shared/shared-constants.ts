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

const EN_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "this",
  "that",
  "you",
  "i",
  "we",
  "he",
  "she",
  "they",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "not",
  "no",
  "yes",
]);

const DE_STOPWORDS = new Set([
  "der",
  "die",
  "das",
  "und",
  "oder",
  "aber",
  "in",
  "an",
  "auf",
  "mit",
  "von",
  "zu",
  "für",
  "im",
  "ist",
  "sind",
  "war",
  "waren",
  "nicht",
  "kein",
  "eine",
  "ein",
  "es",
  "sie",
  "er",
  "du",
  "ich",
  "wir",
  "dass",
  "als",
  "auch",
  "noch",
  "schon",
  "wie",
  "wenn",
  "so",
  "nur",
  "um",
  "aus",
  "bei",
  "nach",
  "über",
  "unter",
  "zwischen",
  "gegen",
  "ohne",
  "wegen",
  "bis",
  "seit",
  "trotz",
  "je",
  "mein",
  "dein",
  "sein",
  "ihr",
  "unser",
]);

const STOPWORDS = new Set([...EN_STOPWORDS, ...DE_STOPWORDS]);

export {
  ALLOWED_IMPORT_EXTENSIONS,
  ALLOWED_PROTOCOLS,
  APP_EVENTS,
  DE_STOPWORDS,
  DEFAULT_SETTINGS,
  EMPTY_DOC,
  EN_STOPWORDS,
  MAX_BYTES_FILE,
  MAX_CHARACTERS,
  MAX_SEARCH_LENGTH,
  MIN_SEARCH_LENGTH,
  SETTINGS_CATEGORIES,
  SIDEBAR_FILTER_MODES,
  STOPWORDS,
  TABLE_ACTIONS,
  UNTITLED,
};
