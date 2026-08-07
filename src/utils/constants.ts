import type { QuickActionConfig, SelectionActionConfig } from "@/utils/types";

const DEBOUNCE_MS = {
  very_fast: 150,
  fast: 300,
  normal: 500,
  slow: 3000,
} as const;

const MIME_TO_EXT: Record<string, string | undefined> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const MAX_SIZE = 25 * 1024 * 1024; // 25MB -> 25MB * 1024 = 25,600KB -> *1024 = 26,214,400B. file.size from JS is always in bytes

const YIELD_MS = 300;

const MAX_FILE_DROPS = 50;

const MAX_DROP_PASTE_CHARACTERS = 200_000;

const MAX_CODE_BLOCK_HIGHLIGHT_LENGTH = 20_000;

const CHAR_BASELINE = 100_000;

const MAX_DROP_LENGTH = 20;

const NODE_BASELINE = 5000;

const UNTAGGED = "_untagged_";

const SIDEBAR_ALL_NOTES_LIMIT = 50;

const MAX_WORKER_TIMEOUT_MS = 180_000;

const IMAGE_MAX_WIDTH = 1000;

const IMAGE_QUALITY = 0.9;

const SELECTION_ACTIONS: SelectionActionConfig[] = [
  { id: "cancel", icon: "X" },
  { id: "pin", icon: "Pin" },
  { id: "export", icon: "Download" },
  {
    id: "copy-rich-text",
    icon: "FileSymlink",
  },
  { id: "delete", icon: "Trash2" },
] as const;

const QUICK_ACTIONS: QuickActionConfig[] = [
  { id: "open-path", icon: "FolderCog", label: "Open App Path" },
  { id: "backup-db", icon: "DatabaseBackup", label: "Database Backup" },
  { id: "backup-notes", icon: "Download", label: "File Backup" },
  {
    id: "backup-db-restore",
    icon: "ArchiveRestore",
    label: "Restore Database from Backup",
  },
] as const;

const THEME_MAP = {
  system: "system",
  light: "light",
  dark: "dark",
  light_warm: "light",
  dark_warm: "dark",
} as const;

const CODE_THEME_MAP = {
  focus: { dark: "github-dark", light: "github-light" },
  balanced: { dark: "atom-one-dark", light: "atom-one-light" },
  colorless: { dark: "colorless", light: "colorless" },
} as const;

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

const KATEX_MACROS = {
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\C": "\\mathbb{C}",
  "\\P": "\\mathbb{P}",
  "\\E": "\\mathbb{E}",
  "\\Var": "\\operatorname{Var}",
  "\\Cov": "\\operatorname{Cov}",
  "\\Prob": "\\operatorname{P}",
  "\\dd": "\\,\\mathrm{d}",
  "\\dx": "\\,\\mathrm{d}x",
  "\\dy": "\\,\\mathrm{d}y",
  "\\dz": "\\,\\mathrm{d}z",
  "\\abs": "\\left|#1\\right|",
  "\\norm": "\\left\\lVert#1\\right\\rVert",
  "\\set": "\\left\\{#1\\right\\}",
};

const SHARED_KATEX_OPTIONS = {
  strict: "ignore" as const,
  maxExpand: 500,
  maxSize: 12,
  throwOnError: false,
  macros: { ...KATEX_MACROS },
};

export {
  ALLOWED_TYPES,
  BLOCK_TYPES,
  CHAR_BASELINE,
  CODE_THEME_MAP,
  DEBOUNCE_MS,
  DOMPURIFY_CONFIG,
  IMAGE_MAX_WIDTH,
  IMAGE_QUALITY,
  KATEX_MACROS,
  MAX_CODE_BLOCK_HIGHLIGHT_LENGTH,
  MAX_DROP_LENGTH,
  MAX_DROP_PASTE_CHARACTERS,
  MAX_FILE_DROPS,
  MAX_SIZE,
  MAX_WORKER_TIMEOUT_MS,
  MIME_TO_EXT,
  NODE_BASELINE,
  QUICK_ACTIONS,
  SELECTION_ACTIONS,
  SHARED_KATEX_OPTIONS,
  SIDEBAR_ALL_NOTES_LIMIT,
  THEME_MAP,
  UNTAGGED,
  YIELD_MS,
};
