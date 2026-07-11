import type { SIDEBAR_FILTER_MODES } from "@shared/constants";
import type { AppErrorCode, WorkerErrorCode } from "@shared/errors";
import type {
  CodeTheme,
  ExportFormat,
  Theme,
} from "@shared/schemas/store-schema";
import type { Content, Editor, SetContentOptions } from "@tiptap/core";

type NativeWindowColors = {
  backgroundColor: string;
  overlayOptions: TitleBarOverlayOptions;
};

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
  focus?: boolean;
};

interface ErrorHandlerOptions {
  ignore?: string[];
}

type ResolvedTheme = "light" | "dark";

type SelectOption<T extends string | boolean> = { value: T; label: string };

type Code =
  | "github-light"
  | "github-dark"
  | "atom-one-light"
  | "atom-one-dark"
  | "colorless";

type Result<T, E = AppErrorCode> =
  | { success: true; data: T }
  | {
      success: false;
      error: E;
    };

type Success<T> = Extract<Result<T>, { success: true }>;
type Failure<E = AppErrorCode> = Extract<Result<never, E>, { success: false }>;

type WorkerResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: WorkerErrorCode };

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

type ImportedContent = {
  fileName: string;
  content: Content;
  extension: "md" | "html" | "json" | "txt";
};

type ExportedContent = {
  created_at: string;
  fileName: string;
  content: string;
  extension: ExportFormat;
};

type FileContent = {
  id: string;
  fileName: string;
  previousTitle?: string;
  content: string;
  extension: "md";
};

type PDFAssets = { template: string; css: string };

type ContentType = "markdown" | "html" | "json" | "text";

type ZoomAction = "get" | "in" | "out" | "reset";

type EditorContentType = NonNullable<SetContentOptions["contentType"]>;

type SettingsCategory = "Appearance" | "Editor" | "General";

type DBBackupResult = {
  totalPages: number;
  remainingPages: number;
};

type MenuType = "table" | "text" | "note";

type NoteMenuPayload = {
  id: string;
  pinned?: boolean;
};

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

type ImageSrc = {
  imageSrc: string;
};

type ThemeResult = { theme: Theme; codeTheme: CodeTheme };

type SidebarChange =
  | { type: "reload" }
  | { type: "update"; noteId: string }
  | { type: "add"; noteId: string }
  | { type: "remove"; noteId: string };

type ResizeOptions = {
  minWidth?: number;
  maxWidth?: number;
  cssVariable?: string;
};

type SearchOptions = {
  searchTerm?: string;
  replaceTerm?: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regexp?: boolean;
  literal?: boolean;
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
  | "backup-notes"
  | "vacuum-db";

type QuickActionConfig = {
  id: QuickAction;
  icon: string;
  label: string;
};

type SyncResult =
  | { status: "MISSING" }
  | { status: "UNCHANGED" }
  | {
      status: "MODIFIED";
      markdown: string;
      dbContent: string;
    };

type FilterMode = (typeof SIDEBAR_FILTER_MODES)[number];

export type {
  Action,
  ActionMap,
  AppRegistry,
  Code,
  ContentType,
  CoreRegistry,
  DBBackupResult,
  EditorContentType,
  ErrorHandlerOptions,
  ExportedContent,
  ExportFormat,
  Failure,
  FileContent,
  FilterMode,
  ImageSrc,
  ImportedContent,
  MenuType,
  Metadata,
  NativeWindowColors,
  NoteMenuPayload,
  PDFAssets,
  QuickActionConfig,
  ResizeOptions,
  ResolvedTheme,
  Result,
  SearchOptions,
  SelectionAction,
  SelectionActionConfig,
  SelectOption,
  SettingsCategory,
  SidebarChange,
  Success,
  SyncResult,
  TemplateRegistry,
  ThemeResult,
  TitleBarOverlayOptions,
  UIRegistry,
  WorkerResult,
  ZoomAction,
};
