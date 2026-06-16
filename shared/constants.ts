import type { NoteSearchDoc } from "@shared/schemas/note-schema";
import type { CodeTheme, Theme } from "@shared/schemas/store-schema";
import type { Code, ContentType, ResolvedTheme, ViewItem } from "@shared/types";
import type { Editor } from "@tiptap/core";
import type { IFuseOptions } from "fuse.js";

const APP_START_TIME = Date.now();

const IPC_TIMERS = new Map<string, number>();

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

const VIEWS: ViewItem[] = [
  { id: "all", label: "All Notes" },
  { id: "bookmarked", label: "Bookmarked" },
  { id: "pinned", label: "Pinned" },
  { id: "todos", label: "Pending Todos" },
  { id: "untagged", label: "Untagged Notes" },
  { id: "links", label: "Incoming Links" },
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
    /^(?:(?:https?|mailto|tel|appimg):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

const FUSE_OPTIONS: IFuseOptions<NoteSearchDoc> = {
  useExtendedSearch: true,
  includeMatches: true,
  ignoreLocation: true,
  distance: 100,
  keys: [
    { name: "title", weight: 2.0 },
    { name: "plainText", weight: 1.0 },
    { name: "tags", weight: 1.5 },
  ],
  threshold: 0.2,
};

const MAX_CHARS = 47; // snippet max chars before appending ...
const PADDING = 15; // padding for highlight snippet to show context

const UNTITLED = "New Note";

const EMPTY_DOC = { type: "doc" as const, content: [{ type: "paragraph" }] };

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "codeBlock",
  "tableRow",
]);

export {
  ALLOWED_TYPES,
  APP_START_TIME,
  BATCH_SIZE,
  BLOCK_TYPES,
  CLEANUP,
  CODE_THEME_MAP,
  CONTENT_TYPE_MAP,
  DEBOUNCE_MS,
  DOMPURIFY_CONFIG,
  EMPTY_DOC,
  FUSE_OPTIONS,
  IPC_TIMERS,
  LIMITS,
  MAX_CHARS,
  MAX_SIZE,
  MIME_TO_EXT,
  PADDING,
  THEME_DATA,
  THEME_MAP,
  UNTITLED,
  VIEWS,
  YIELD_INTERVAL,
  ZOOMS,
};
