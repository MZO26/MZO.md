import type { AppErrorCode, WorkerErrorCode } from "@shared/constants";
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

type ResolvedTheme = "light" | "dark";

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
  title: string;
  snippet: string;
  tags: string[];
  todos_left: number;
  links: string[];
};

type ImportedContent = {
  fileName: string;
  content: Content;
  extension: "md" | "html" | "json" | "txt";
};

type ExportFormat = "json" | "txt" | "md" | "html" | "pdf";

type ExportedContent = {
  id: string;
  fileName: string;
  content: string;
  extension: ExportFormat;
};

type ExportResult = {
  id: string;
  filePath: string;
};

type View = "all" | "bookmarked" | "pinned" | "todos" | "untagged";

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
  settings: Partial<SettingsRegistry>;
  editor: Editor;
  appContainer: HTMLDivElement;
  sidebar: HTMLDivElement;
  editorWrapper: HTMLDivElement;
  editorContainer: HTMLDivElement;
}

type SettingsKeys =
  | "themeSelect"
  | "codeThemeSelect"
  | "highlightSelect"
  | "fontFamilySelect"
  | "fontSizeSelect"
  | "lineHeightSelect"
  | "focusSelect"
  | "spellcheckSelect"
  | "batchExportSelect"
  | "noteItemSelect"
  | "dbOptimizeSelect";

interface SettingsRegistry extends Record<SettingsKeys, HTMLSelectElement> {}

type ImageSrc = {
  imageSrc: string;
};

export type {
  Action,
  ActionMap,
  AppRegistry,
  Code,
  ContentType,
  DBBackupResult,
  DbOptimization,
  ExportedContent,
  ExportFormat,
  ExportResult,
  Failure,
  ImageSrc,
  ImportedContent,
  MenuType,
  Metadata,
  NativeWindowColors,
  NoteMenuPayload,
  ResolvedTheme,
  Result,
  SettingsKeys,
  SettingsRegistry,
  Success,
  TitleBarOverlayOptions,
  View,
  ViewItem,
  WorkerResult,
  ZoomAction,
};
