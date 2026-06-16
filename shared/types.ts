import type { AppErrorCode, WorkerErrorCode } from "@shared/errors";
import type { CodeTheme, Theme } from "@shared/schemas/store-schema";
import type { Content, Editor } from "@tiptap/core";

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

type ExportFormat = "json" | "txt" | "md" | "html" | "pdf";

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

type View = "all" | "bookmarked" | "pinned" | "todos" | "untagged" | "links";

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
  bookmarked: boolean;
  pinned: boolean;
};

type ViewItem = {
  id: string;
  label: string;
};

interface AppRegistry {
  stats: Partial<StatRegistry>;
  core: Partial<CoreRegistry>;
  template: Partial<TemplateRegistry>;
}

interface CoreRegistry {
  editor: Editor;
  appContainer: HTMLDivElement;
  sidebar: HTMLDivElement;
  editorWrapper: HTMLDivElement;
  editorContainer: HTMLDivElement;
}

interface StatRegistry {
  wordCountEl: HTMLSpanElement;
  charCountEl: HTMLSpanElement;
  readingTime: HTMLSpanElement;
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
  | { type: "remove"; noteId: string }
  | null;

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
  SelectOption,
  SidebarChange,
  SnippetCacheValue,
  StatRegistry,
  Success,
  TemplateRegistry,
  ThemeResult,
  TitleBarOverlayOptions,
  View,
  ViewItem,
  WorkerResult,
  ZoomAction,
};
