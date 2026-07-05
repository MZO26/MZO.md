import type {
  AutoExport,
  CodeTheme,
  ExportFormat,
  FontFamily,
  FontSize,
  HighlightTheme,
  LineHeight,
  NoteItemDisplay,
  Spellcheck,
  Theme,
} from "@shared/schemas/store-schema";
import type {
  Code,
  EditorContentType,
  QuickActionConfig,
  ResolvedTheme,
  SelectionActionConfig,
  SelectOption,
} from "@shared/types";

const APP_START_TIME = Date.now();

const IPC_TIMERS = new Map<string, number>();

const YIELD_INTERVAL = 0;

const BATCH_SIZE = 5;

const MAX_FILE_DROPS = 50;

const ZOOMS = [1, 1.1, 1.25] as const;

const CONTENT_TYPE_MAP: Record<string, EditorContentType> = {
  md: "markdown",
  html: "html",
  json: "json",
};

const SYNC_BUFFER = 2000; // 2 seconds to account for DB timestamp differences or OS write delays

const LIMITS = {
  WRITE_HEAVY: 500,
  WRITE_STANDARD: 500,
  WRITE_LIGHT: 300,
  READ_HEAVY: 500,
  READ_LIGHT: 100,
  WRITE_FLUSH: 5,
};

const DEBOUNCE_MS = {
  very_fast: 150, // window events
  fast: 300,
  normal: 1000,
  slow: 2000,
} as const;

const MIME_TO_EXT = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const MAX_SIZE = 25 * 1024 * 1024; // 25MB -> 25MB * 1024 = 25,600KB -> *1024 = 26,214,400B. file.size from JS is always in bytes

const UNTAGGED = "_untagged_";

const SIDEBAR_ALL_NOTES_LIMIT = 50;

const SELECTION_ACTIONS: SelectionActionConfig[] = [
  { id: "cancel", icon: "x" },
  { id: "pin", icon: "pin" },
  { id: "export", icon: "download" },
  {
    id: "copy-rich-text",
    icon: "file-symlink",
  },
  { id: "delete", icon: "trash-2" },
];

const QUICK_ACTIONS: QuickActionConfig[] = [
  { id: "open-path", icon: "folder-cog", label: "Open App Path" },
  { id: "backup-db", icon: "database-backup", label: "Database Backup" },
  { id: "backup-notes", icon: "download", label: "File Backup" },
  {
    id: "vacuum-db",
    icon: "hard-drive",
    label: "Compact Database",
  },
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
  "light-warm": "light",
  "dark-warm": "dark",
} as const;

const CODE_THEME_MAP: Record<CodeTheme, Record<ResolvedTheme, Code>> = {
  focus: { dark: "github-dark", light: "github-light" },
  balanced: { dark: "atom-one-dark", light: "atom-one-light" },
  colorless: { dark: "colorless", light: "colorless" },
} as const;

const THEME_DATA: Record<
  Exclude<Theme, "system">,
  {
    color: string;
    symbolColor: string;
    background: string;
    isDark: boolean;
    focus: string;
  }
> = {
  light: {
    color: "#f2f2f4", // --bg-sidebar
    symbolColor: "#18181b", // --text-main
    background: "#f2f2f4", // --bg-sidebar
    isDark: false,
    focus: "#fcfcfc", // --bg-editor
  },
  dark: {
    color: "#111115",
    symbolColor: "#a1a1aa", // --text-muted
    background: "#111115",
    isDark: true,
    focus: "#1e1e21",
  },
  "light-warm": {
    color: "#eceae3",
    symbolColor: "#1c1917",
    background: "#eceae3",
    isDark: false,
    focus: "#f8f7f3",
  },
  "dark-warm": {
    color: "#110f0b",
    symbolColor: "#d4cfc5",
    background: "#110f0b",
    isDark: true,
    focus: "#1e1b17",
  },
} as const;

const DOMPURIFY_CONFIG = {
  FORBID_TAGS: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "form",
    "button",
    "select",
    "textarea",
    "base",
    "link",
    "meta",
    "noscript",
    "template",
  ],
  FORBID_ATTR: [
    "onerror",
    "onload",
    "onclick",
    "onmouseover",
    "onmouseout",
    "onmouseenter",
    "onmouseleave",
    "onfocus",
    "onblur",
    "onchange",
    "oninput",
    "onsubmit",
    "onreset",
    "onkeydown",
    "onkeyup",
    "onkeypress",
    "oncontextmenu",
    "ondblclick",
    "ondrag",
    "ondrop",
    "style",
    "formaction",
    "srcdoc",
    "xlink:href",
  ],
  ALLOW_ONLY_SAFE_URI_ATTRIBUTES: true,
  FORCE_BODY: true,
  ALLOWED_URI_REGEXP:
    /^(?:(?:https|appimg):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

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
  "image",
  "detailsBlock",
  "hardBreak",
]);

const THEME_SETTINGS: readonly SelectOption<Theme>[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "light-warm", label: "Light · Warm" },
  { value: "dark", label: "Dark" },
  { value: "dark-warm", label: "Dark · Warm" },
];

const CODE_THEME_SETTINGS: readonly SelectOption<CodeTheme>[] = [
  { value: "focus", label: "Focus" },
  { value: "balanced", label: "Balanced" },
  { value: "colorless", label: "Colorless" },
];

const HIGHLIGHT_THEME_SETTINGS: readonly SelectOption<HighlightTheme>[] = [
  { value: "context", label: "Context" },
  { value: "insight", label: "Insight" },
  { value: "action", label: "Action" },
];

const NOTE_ITEM_DISPLAY_SETTINGS: readonly SelectOption<NoteItemDisplay>[] = [
  {
    value: "preview",
    label: "Preview",
  },
  {
    value: "tags",
    label: "Tags",
  },
  {
    value: "minimal",
    label: "Minimal",
  },
];

const FONT_FAMILY_SETTINGS: readonly SelectOption<FontFamily>[] = [
  { value: "system", label: "System" },
  { value: "arial", label: "Arial" },
  { value: "serif", label: "Serif" },
];

const FONT_SIZE_SETTINGS: readonly SelectOption<FontSize>[] = [
  { value: "16", label: "Small" },
  { value: "18", label: "Medium" },
  { value: "20", label: "Large" },
];

const LINE_HEIGHT_SETTINGS: readonly SelectOption<LineHeight>[] = [
  { value: "1.4", label: "Small" },
  { value: "1.5", label: "Medium" },
  { value: "1.6", label: "Large" },
];

const SPELLCHECK_SETTINGS: readonly SelectOption<Spellcheck>[] = [
  { value: true, label: "Enable" },
  { value: false, label: "Disable" },
];

const EXPORT_FORMAT_SETTINGS: readonly SelectOption<ExportFormat>[] = [
  { value: "json", label: "JSON" },
  { value: "md", label: "Markdown" },
  { value: "txt", label: "Plain Text" },
  { value: "html", label: "HTML" },
  { value: "pdf", label: "PDF" },
];

const AUTO_EXPORT_SETTINGS: readonly SelectOption<AutoExport>[] = [
  { value: true, label: "Enable" },
  { value: false, label: "Disable" },
];

export {
  ALLOWED_TYPES,
  APP_START_TIME,
  AUTO_EXPORT_SETTINGS,
  BATCH_SIZE,
  BLOCK_TYPES,
  CODE_THEME_MAP,
  CODE_THEME_SETTINGS,
  CONTENT_TYPE_MAP,
  DEBOUNCE_MS,
  DOMPURIFY_CONFIG,
  EMPTY_DOC,
  EXPORT_FORMAT_SETTINGS,
  FONT_FAMILY_SETTINGS,
  FONT_SIZE_SETTINGS,
  HIGHLIGHT_THEME_SETTINGS,
  IPC_TIMERS,
  LIMITS,
  LINE_HEIGHT_SETTINGS,
  MAX_FILE_DROPS,
  MAX_SIZE,
  MIME_TO_EXT,
  NOTE_ITEM_DISPLAY_SETTINGS,
  QUICK_ACTIONS,
  SELECTION_ACTIONS,
  SIDEBAR_ALL_NOTES_LIMIT,
  SPELLCHECK_SETTINGS,
  SYNC_BUFFER,
  THEME_DATA,
  THEME_MAP,
  THEME_SETTINGS,
  UNTAGGED,
  UNTITLED,
  YIELD_INTERVAL,
  ZOOMS,
};
