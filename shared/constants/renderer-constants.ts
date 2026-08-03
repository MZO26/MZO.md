import type { CodeTheme } from "@shared/schemas/store-schema";
import type { Code, EditorContentType, ResolvedTheme } from "@shared/types";

const CONTENT_TYPE_MAP: Record<string, EditorContentType | undefined> = {
  md: "markdown",
  html: "html",
  json: "json",
};

const DEBOUNCE_MS = {
  very_fast: 150, // global search
  fast: 300, // set settings
  normal: 500, // in doc search
  slow: 3000, // note save + auto export
} as const;

const MIME_TO_EXT: Record<string, string | undefined> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const ALLOWED_IMPORT_EXTENSIONS = ["md", "html", "json", "txt"] as const;

const MAX_SIZE = 25 * 1024 * 1024; // 25MB -> 25MB * 1024 = 25,600KB -> *1024 = 26,214,400B. file.size from JS is always in bytes

const YIELD_MS = 300;

const MAX_FILE_DROPS = 50;

const MAX_BYTES_FILE = 3 * 1024 * 1024;

const MAX_CHARACTERS = 3_000_000;

const MAX_DROP_PASTE_CHARACTERS = 200_000;

const MAX_CODE_BLOCK_HIGHLIGHT_LENGTH = 20_000;

const CHAR_BASELINE = 100_000;

const MAX_DROP_LENGTH = 20;

const NODE_BASELINE = 5000;

const UNTAGGED = "_untagged_";

const SIDEBAR_ALL_NOTES_LIMIT = 50;

const MAX_SEARCH_LENGTH = 100;

const MIN_SEARCH_LENGTH = 2;

const MAX_WORKER_TIMEOUT_MS = 180_000;

const IMAGE_MAX_WIDTH = 1000;

const IMAGE_QUALITY = 0.9;

const SIDEBAR_FILTER_MODES = ["recent", "search", "tag"] as const;

const ALLOWED_PROTOCOLS = ["https:", "http:", "appimg:", "file:"];

const SELECTION_ACTIONS = [
  { id: "cancel", icon: "x" },
  { id: "pin", icon: "pin" },
  { id: "export", icon: "download" },
  {
    id: "copy-rich-text",
    icon: "file-symlink",
  },
  { id: "delete", icon: "trash-2" },
];

const QUICK_ACTIONS = [
  { id: "open-path", icon: "folder-cog", label: "Open App Path" },
  { id: "backup-db", icon: "database-backup", label: "Database Backup" },
  { id: "backup-notes", icon: "download", label: "File Backup" },
  {
    id: "backup-db-restore",
    icon: "archive-restore",
    label: "Restore Database from Backup",
  },
];

const THEME_MAP = {
  system: "system",
  light: "light",
  dark: "dark",
  light_warm: "light",
  dark_warm: "dark",
} as const;

const CODE_THEMES = [
  "github-light",
  "github-dark",
  "atom-one-light",
  "atom-one-dark",
  "colorless",
] as const;

const CODE_THEME_MAP: Record<CodeTheme, Record<ResolvedTheme, Code>> = {
  focus: { dark: "github-dark", light: "github-light" },
  balanced: { dark: "atom-one-dark", light: "atom-one-light" },
  colorless: { dark: "colorless", light: "colorless" },
} as const;

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

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "inlineMath",
  "blockMath",
  "hardBreak",
  "image",
  "noteTag",
  "wikilink",
]);

export {
  ALLOWED_IMPORT_EXTENSIONS,
  ALLOWED_PROTOCOLS,
  ALLOWED_TYPES,
  BLOCK_TYPES,
  CHAR_BASELINE,
  CODE_THEME_MAP,
  CODE_THEMES,
  CONTENT_TYPE_MAP,
  DEBOUNCE_MS,
  EMPTY_DOC,
  IMAGE_MAX_WIDTH,
  IMAGE_QUALITY,
  MAX_BYTES_FILE,
  MAX_CHARACTERS,
  MAX_CODE_BLOCK_HIGHLIGHT_LENGTH,
  MAX_DROP_LENGTH,
  MAX_DROP_PASTE_CHARACTERS,
  MAX_FILE_DROPS,
  MAX_SEARCH_LENGTH,
  MAX_SIZE,
  MAX_WORKER_TIMEOUT_MS,
  MIME_TO_EXT,
  MIN_SEARCH_LENGTH,
  NODE_BASELINE,
  QUICK_ACTIONS,
  SELECTION_ACTIONS,
  SIDEBAR_ALL_NOTES_LIMIT,
  SIDEBAR_FILTER_MODES,
  THEME_MAP,
  UNTAGGED,
  UNTITLED,
  YIELD_MS,
};
