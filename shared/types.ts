import type {
  ALLOWED_IMPORT_EXTENSIONS,
  CODE_THEMES,
  QUICK_ACTIONS,
  SELECTION_ACTIONS,
  SIDEBAR_FILTER_MODES,
} from "@shared/constants/renderer-constants";
import type { AppErrorCode, WorkerErrorCode } from "@shared/errors";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { ExportFormat, Theme } from "@shared/schemas/store-schema";
import type { Editor, SetContentOptions } from "@tiptap/core";
import type { SETTINGS_CATEGORIES } from "./constants/setting-constants";

type NativeWindowColors = {
  backgroundColor: string;
  overlayOptions: TitleBarOverlayOptions;
};

type LinkAttributes = {
  href?: string;
  url?: string;
};

type MathOptions =
  | {
      mode: "insert";
      type: "inline" | "block";
      initialValue?: string;
    }
  | {
      mode: "update";
      type: "inline" | "block";
      pos: number;
      initialValue?: string;
    };

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
  focus?: boolean;
};

type UrlDecision = "allow" | "block" | "external";

type ResolvedTheme = Extract<Theme, "light" | "dark">;

type SelectOption<T extends string | boolean> = { value: T; label: string };

type Code = (typeof CODE_THEMES)[number];

type TableAction =
  | "addRowBefore"
  | "addRowAfter"
  | "addColumnBefore"
  | "addColumnAfter"
  | "deleteRow"
  | "deleteColumn"
  | "deleteTable";

type Expand<T> = T extends unknown ? { [K in keyof T]: T[K] } : never;

type DeepExpand<T> = T extends object
  ? { [K in keyof T]: DeepExpand<T[K]> }
  : T;

type Success<T> = {
  success: true;
  data: T;
};

type Failure<E = AppErrorCode> = {
  success: false;
  error: E;
};

type Result<T, E = AppErrorCode> = Success<T> | Failure<E>;

type WorkerSuccess<T> = {
  success: true;
  data: T;
};

interface WorkerRequest<T> {
  id: string;
  payload: T;
}

type WorkerFailure<E = WorkerErrorCode> = {
  success: false;
  error: E;
};

type WorkerResult<T, E = WorkerErrorCode> = WorkerSuccess<T> | WorkerFailure<E>;

type Action = {
  type?: "action";
  run: (args?: Editor | null) => void;
  isActive?: (args: Editor) => boolean;
  isDisabled?: (args: Editor) => boolean;
  icon: string;
};

type Divider = {
  type: "divider";
};

type ToolbarItem = Action | Divider;

type ActionMap = Record<string, ToolbarItem>;

type Metadata = {
  snippet: string;
  tags: string[];
  links: string[];
};

type ImportStats = {
  total: number;
  duplicates: number;
  errors: number;
};

type ImageCompressionPayload = {
  buffer: ArrayBuffer;
  mimeType: string;
  maxWidth: number;
  quality: number;
};

type PDFAssets = { template: string; css: string };

type ImportExtension = (typeof ALLOWED_IMPORT_EXTENSIONS)[number];

type ContentType = ImportExtension;

type EditorContentType = NonNullable<SetContentOptions["contentType"]>;

type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

interface AppRegistry {
  ui: Partial<UIRegistry>;
  core: Partial<CoreRegistry>;
  template: Partial<TemplateRegistry>;
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
  metadataContainer: HTMLDivElement;
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
}

type SidebarParams = {
  visibleNotes: NoteListItem[];
  query: string;
  activeTag?: string | null;
};

type SelectionParams = {
  selectionMode: boolean;
  selectedIds: Set<string>;
};

type AllTagsMenu = {
  popover: HTMLDivElement;
  content: HTMLDivElement;
  render(tags: string[]): void;
  toggle(): void;
  open(): void;
  close(): void;
};

type SelectionAction = (typeof SELECTION_ACTIONS)[number]["id"];

type QuickAction = (typeof QUICK_ACTIONS)[number]["id"];

type QuickActionConfig = {
  id: QuickAction;
  icon: string;
  label: string;
};

type FilterMode = (typeof SIDEBAR_FILTER_MODES)[number];

export type {
  Action,
  ActionMap,
  AllTagsMenu,
  AppRegistry,
  Code,
  ContentType,
  CoreRegistry,
  DeepExpand,
  EditorContentType,
  Expand,
  ExportFormat,
  Failure,
  FilterMode,
  ImageCompressionPayload,
  ImportExtension,
  ImportStats,
  LinkAttributes,
  MathOptions,
  Metadata,
  NativeWindowColors,
  PDFAssets,
  QuickAction,
  QuickActionConfig,
  ResolvedTheme,
  Result,
  SelectionAction,
  SelectionParams,
  SelectOption,
  SettingsCategory,
  SidebarParams,
  Success,
  TableAction,
  TemplateRegistry,
  TitleBarOverlayOptions,
  ToolbarItem,
  UIRegistry,
  UrlDecision,
  WorkerRequest,
  WorkerResult,
};
