import type {
  ALLOWED_IMPORT_EXTENSIONS,
  SIDEBAR_FILTER_MODES,
} from "@shared/constants";
import type { AppErrorCode, WorkerErrorCode } from "@shared/errors";
import type { ExportFormat, Theme } from "@shared/schemas/store-schema";
import type { Editor, SetContentOptions } from "@tiptap/core";

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

type Code =
  | "github-light"
  | "github-dark"
  | "atom-one-light"
  | "atom-one-dark"
  | "colorless";

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
  shortcut: string;
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

type SettingsCategory = "Appearance" | "Editor" | "General";

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

type ResizeOptions = {
  minWidth?: number;
  maxWidth?: number;
  cssVariable?: string;
};

type SelectionAction =
  | "cancel"
  | "pin"
  | "export"
  | "copy-rich-text"
  | "delete";

type SelectionActionConfig = {
  id: SelectionAction;
  icon: string;
};

type QuickAction =
  | "open-path"
  | "backup-db"
  | "backup-db-restore"
  | "backup-notes";

type QuickActionConfig = {
  id: QuickAction;
  icon: string;
  label: string;
};

type AllTagsMenu = {
  button: HTMLButtonElement;
  popover: HTMLDivElement;
  content: HTMLDivElement;
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
  QuickActionConfig,
  ResizeOptions,
  ResolvedTheme,
  Result,
  SelectionAction,
  SelectionActionConfig,
  SelectOption,
  SettingsCategory,
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
