import type { CodeTheme, Theme } from "@shared/schemas/store-schema";
import type { Code, ContentType, ResolvedTheme, ViewItem } from "@shared/types";
import type { Editor } from "@tiptap/core";

enum WorkerErrorCode {
  CompressionError = "COMPRESSION_FAILED",
  InvalidImageError = "INVALID_IMAGE",
  UnknownError = "UNKNOWN_ERROR",
}

enum AppErrorCode {
  DBError = "DB_ERROR",
  InvalidData = "INVALID_DATA",
  FileWriteError = "FILE_WRITE_ERROR",
  RateLimitError = "RATE_LIMIT",
  SenderError = "UNAUTHORIZED_SENDER",
  UnknownError = "UNKNOWN_ERROR",
  InvalidViewError = "INVALID_VIEW",
  CancelledOperation = "CANCELLED_OPERATION",
  CompressionError = "COMPRESSION_ERROR",
  InvalidImageError = "INVALID_IMAGE_ERROR",
  InvalidDbAction = "INVALID_ACTION",
  ExportError = "EXPORT_ERROR",
  AutoSaveError = "AUTOSAVE_ERROR",
  InvalidDialog = "INVALID_DIALOG",
}

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [AppErrorCode.DBError]: "Failed to access database.",
  [AppErrorCode.InvalidData]: "Couldn't read the notes' data.",
  [AppErrorCode.FileWriteError]: "Failed to write file.",
  [AppErrorCode.RateLimitError]: "Too many attempts. Please wait.",
  [AppErrorCode.SenderError]: "Action blocked for security.",
  [AppErrorCode.UnknownError]: "An unexpected error occurred.",
  [AppErrorCode.InvalidViewError]: "Cannot open this view.",
  [AppErrorCode.CancelledOperation]: "Operation cancelled.",
  [AppErrorCode.CompressionError]: "Failed to compress file.",
  [AppErrorCode.InvalidImageError]: "Unsupported image format.",
  [AppErrorCode.InvalidDbAction]: "This action is not allowed.",
  [AppErrorCode.ExportError]: "Export failed.",
  [AppErrorCode.AutoSaveError]: "Autosave failed.",
  [AppErrorCode.InvalidDialog]: "Unsupported Operation.",
};

const APP_START_TIME = Date.now();

const ipcTimers = new Map<string, number>();

const YIELD_INTERVAL = 0;

const BATCH_SIZE = 5;

const ZOOMS = [1, 1.1, 1.25] as const;

const CONTENT_TYPE_MAP: Record<string, ContentType> = {
  md: "markdown",
  html: "html",
  json: "json",
};

const CLEANUP = new WeakMap<
  Editor,
  { flush: () => Promise<void>; cancel: () => void }
>();

const LIMITS = {
  WRITE_HEAVY: 500,
  WRITE_STANDARD: 500,
  WRITE_LIGHT: 300,
  READ_HEAVY: 500,
  READ_LIGHT: 100,
  WRITE_FLUSH: 5,
};

const DEBOUNCE_MS = {
  fast: 300,
  slow: 1000,
} as const;

const mimeToExt = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const MAX_SIZE = 25 * 1024 * 1024; // 25MB -> 25MB * 1024 = 25,600KB -> *1024 = 26,214,400B. file.size from JS is always in bytes

const VIEWS: ViewItem[] = [
  { id: "all", label: "All Notes" },
  { id: "bookmarked", label: "Bookmarked" },
  { id: "pinned", label: "Pinned" },
  { id: "todos", label: "Pending Todos" },
  { id: "untagged", label: "Untagged Notes" },
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
    "input",
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
    // Event handlers
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
    // Dangerous attributes
    "style", // prevents CSS injection
    "formaction", // hijacks form submission
    "srcdoc", // iframe HTML injection
    "xlink:href", // SVG-based XSS
  ],
  ALLOW_ONLY_SAFE_URI_ATTRIBUTES: true, // blocks javascript: and data: in href/src
  FORCE_BODY: true, // prevents mXSS via fragment parsing edge cases
};

export {
  ALLOWED_TYPES,
  APP_START_TIME,
  AppErrorCode,
  BATCH_SIZE,
  CLEANUP,
  CODE_THEME_MAP,
  CONTENT_TYPE_MAP,
  DEBOUNCE_MS,
  DOMPURIFY_CONFIG,
  ERROR_MESSAGES,
  ipcTimers,
  LIMITS,
  MAX_SIZE,
  mimeToExt,
  THEME_DATA,
  THEME_MAP,
  VIEWS,
  WorkerErrorCode,
  YIELD_INTERVAL,
  ZOOMS,
};
