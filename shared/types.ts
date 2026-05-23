import type { Content, Editor } from "@tiptap/core";
import type { Code } from "lucide";

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
  | "solarized-dark"
  | "solarized-light";

type Result<T, E = string> =
  | { success: true; data: T }
  | {
      success: false;
      message: E;
    };

type Success<T> = Extract<Result<T>, { success: true }>;
type Failure<E = string> = Extract<Result<never, E>, { success: false }>;

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
  title: string;
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
  ZoomAction,
};
