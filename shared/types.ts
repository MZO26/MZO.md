import type { AppErrorCode, WorkerErrorCode } from "@shared/errors";
import type {
  CodeTheme,
  ExportFormat,
  Theme,
} from "@shared/schemas/store-schema";
import type { Content, Editor } from "@tiptap/core";
import type { VIEWS } from "./constants";

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

type SelectOption = { value: string; label: string };

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
  todos_left: number;
  links: string[];
};

type ImportedContent = {
  fileName: string;
  content: Content;
  extension: "md" | "html" | "json";
};

type ExportedContent = {
  id: string;
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

type ExportResult = {
  id: string;
  filePath: string;
};

type PDFAssets = { template: string; css: string };

type ContentType = "markdown" | "html" | "json";

type ZoomAction = "get" | "in" | "out" | "reset";

type DbOptimization = "optimize-db" | "vacuum-db" | "backup-db";

type DBBackupResult = {
  totalPages: number;
  remainingPages: number;
};

type MenuType = "table" | "text" | "note";

type NoteMenuPayload = {
  id: string;
  pinned?: boolean;
};

type ViewItem = {
  id: string;
  label: string;
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
  selectionBtn: HTMLButtonElement;
  sidebarHeader: HTMLDivElement;
  sidebarFooter: HTMLDivElement;
  selectionFooter: HTMLDivElement;
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

type SnippetCacheValue = {
  snippet: string;
  indices: [number, number][];
};

type SidebarChange =
  | { type: "reload" }
  | { type: "update"; noteId: string }
  | { type: "prepend"; noteId: string }
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

type ViewId = (typeof VIEWS)[number]["id"];

type SelectionAction =
  | "pin"
  | "export"
  | "copy-links"
  | "copy-markdown"
  | "delete";

type SelectionActionConfig = {
  id: SelectionAction;
  icon: string;
};

export type {
  Action,
  ActionMap,
  AppRegistry,
  Code,
  ContentType,
  CoreRegistry,
  DBBackupResult,
  DbOptimization,
  ErrorHandlerOptions,
  ExportedContent,
  ExportFormat,
  ExportResult,
  Failure,
  FileContent,
  ImageSrc,
  ImportedContent,
  MenuType,
  Metadata,
  NativeWindowColors,
  NoteMenuPayload,
  PDFAssets,
  ResizeOptions,
  ResolvedTheme,
  Result,
  SearchOptions,
  SelectionAction,
  SelectionActionConfig,
  SelectOption,
  SidebarChange,
  SnippetCacheValue,
  Success,
  TemplateRegistry,
  ThemeResult,
  TitleBarOverlayOptions,
  UIRegistry,
  ViewId,
  ViewItem,
  WorkerResult,
  ZoomAction,
};
