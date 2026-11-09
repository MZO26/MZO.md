import type { AppSettings } from "@shared/schemas/store-schema";
import type { JSONContent } from "@tiptap/core";

const MAX_BYTES_FILE = 4 * 1024 * 1024;

const MAX_CHARACTERS = 4_000_000;

const MAX_SEARCH_LENGTH = 100;

const MIN_SEARCH_LENGTH = 2;

const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "appimg:"]);

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const UNTITLED = "Untitled";

const EMPTY_DOC = {
  type: "doc" as const,
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
    },
  ],
} satisfies JSONContent;

const ALLOWED_IMPORT_EXTENSIONS = ["md", "html", "json", "txt"] as const;

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
  SYNC_EDITOR_SEARCH: "app:sync-editor-search",
  TOGGLE_QUICK_SWITCH: "app:toggle-quick-switch",
  TOGGLE_SIDEBAR: "app:toggle-sidebar",
  CREATE_NEW_NOTE: "app:create-new-note",
  SAVE_NOTE: "app:save-note",
  APPLY_VIEW: "app:apply-view",
  HANDLE_WIKILINK_CLICK: "app:handle-wikilink-click",
  FOCUS_GLOBAL_SEARCH: "app:focus-global-search",
  SET_SELECTION_MODE: "app:set-selection-mode",
  EXIT_SELECTION_MODE: "app:exit-selection-mode",
  DELETE_SELECTED: "app:delete-selected",
  SELECT_ALL_VISIBLE: "app:select-all-visible",
  REFRESH_TOOLBAR: "app:refresh-toolbar",
  UNSET_HOVER: "app:unset-hover",
  SET_EDITOR_WIDTH: "app:set-editor-width",
  TOGGLE_FOCUS_MODE: "app:toggle-focus-mode",
  TOGGLE_TOOLBAR: "app:toggle-toolbar",
} as const;

const EDITOR_EVENTS = {
  UNDO: "editor:undo",
  REDO: "editor:redo",
  BOLD: "editor:bold",
  ITALIC: "editor:italic",
  STRIKE: "editor:strike",
  UNDERLINE: "editor:underline",
  HIGHLIGHT: "editor:highlight",
  MATH_INLINE: "editor:math-inline",
  HEADING1: "editor:heading1",
  HEADING2: "editor:heading2",
  HEADING3: "editor:heading3",
  BULLET_LIST: "editor:bullet-list",
  ORDERED_LIST: "editor:ordered-list",
  TASK_LIST: "editor:task-list",
  BLOCK_QUOTE: "editor:block-quote",
  INLINE_CODE: "editor:inline-code",
  CODE_BLOCK: "editor:code-block",
  MATH_BLOCK: "editor:math-block",
  HORIZONTAL_RULE: "editor:horizontal-rule",
  LINK: "editor:link",
  IMAGE: "editor:image",
  TABLE: "editor:table",
} as const;

const SETTING_EVENTS = {
  THEME_SYSTEM: "setting:theme-system",
  THEME_LIGHT: "setting:theme-light",
  THEME_DARK: "setting:theme-dark",
  THEME_DARK_WARM: "setting:theme-dark-warm",
  THEME_LIGHT_WARM: "setting:theme-light-warm",
  THEME_OLED: "setting:theme-oled",
  FONT_FAMILY_SYSTEM: "setting:font-family-system",
  FONT_FAMILY_ARIAL: "setting:font-family-arial",
  FONT_FAMILY_SERIF: "setting:font-family-serif",
  FONT_SIZE_SMALL: "setting:font-size-small",
  FONT_SIZE_MEDIUM: "setting:font-size-medium",
  FONT_SIZE_LARGE: "setting:font-size-large",
  LINE_HEIGHT_SMALL: "setting:line-height-small",
  LINE_HEIGHT_MEDIUM: "setting:line-height-medium",
  LINE_HEIGHT_LARGE: "setting:line-height-large",
  SPELLCHECK: "setting:spellcheck",
  CODE_THEME_FOCUS: "setting:code-theme-focus",
  CODE_THEME_BALANCED: "setting:code-theme-balanced",
  CODE_THEME_COLORLESS: "setting:code-theme-colorless",
  HIGHLIGHT_CONTEXT: "setting:highlight-context",
  HIGHLIGHT_INSIGHT: "setting:highlight-insight",
  HIGHLIGHT_ACTION: "setting:highlight-action",
  NOTE_ITEM_DISPLAY_PREVIEW: "setting:note-item-display-preview",
  NOTE_ITEM_DISPLAY_MINIMAL: "setting:note-item-display-minimal",
  BACKUP_DB: "setting:backup-db",
  RESTORE_DB_BACKUP: "setting:restore-db-backup",
  OPEN_APP_PATH: "setting:open-app-path",
  EXPORT_MARKDOWN: "setting:export-markdown",
  EXPORT_TEXT: "setting:export-text",
  EXPORT_HTML: "setting:export-html",
  EXPORT_PDF: "setting:export-pdf",
} as const;

const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  theme: "system",
  font_family: "system",
  font_size: "18",
  line_height: "1.5",
  spellcheck: false,
  code_theme: "balanced",
  highlight: "context",
  note_item_display: "preview",
  window_bounds: { width: 800, height: 500 },
  active_tag: null,
};

export {
  ALLOWED_IMPORT_EXTENSIONS,
  ALLOWED_PROTOCOLS,
  APP_EVENTS,
  DEFAULT_SETTINGS,
  EDITOR_EVENTS,
  EMPTY_DOC,
  LOCALHOST_HOSTS,
  MAX_BYTES_FILE,
  MAX_CHARACTERS,
  MAX_SEARCH_LENGTH,
  MIN_SEARCH_LENGTH,
  SETTING_EVENTS,
  TABLE_ACTIONS,
  UNTITLED,
};
