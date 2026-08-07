import type { AppSettings } from "@shared/schemas/store-schema";

const MAX_BYTES_FILE = 3 * 1024 * 1024;
const MAX_CHARACTERS = 3_000_000;
const MAX_SEARCH_LENGTH = 100;
const MIN_SEARCH_LENGTH = 2;
const ALLOWED_PROTOCOLS = ["https:", "http:", "appimg:", "file:"];
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

const SETTINGS_CATEGORIES = ["Appearance", "Editor", "General"] as const;

const ALLOWED_IMPORT_EXTENSIONS = ["md", "html", "json", "txt"] as const;

const SIDEBAR_FILTER_MODES = ["recent", "search", "tag"] as const;

const APP_EVENTS = [
  "app:toggle-editor-search",
  "app:toggle-quick-switch",
  "app:toggle-sidebar",
  "app:create-new-note",
  "app:open-global-search",
  "app:set-selection-mode",
  "app:exit-selection-mode",
  "app:delete-selected",
  "app:select-all-visible",
  "app:refresh-toolbar",
  "app:set-editor-width",
  "app:toggle-focus-mode",
  "app:toggle-toolbar",
  "app:open-settings",
] as const;

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
  UNTITLED,
};
