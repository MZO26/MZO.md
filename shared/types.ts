import type { Content } from "@tiptap/core";
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

type Action<T> = {
  type?: "action";
  run: (args: T) => void;
  isActive?: (args: T) => boolean;
  isDisabled?: (args: T) => boolean;
  icon: string;
  shortcut: string;
};

type Divider = {
  type: "divider";
};

type ToolbarItem<T> = Action<T> | Divider;

type ActionMap<T> = Record<string, ToolbarItem<T>>;

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

type ExportItem = {
  id: string;
  fileName: string;
  content: string;
  extension: ExportFormat;
};

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

export type {
  Action,
  ActionMap,
  Code,
  ContentType,
  DBBackupResult,
  DbOptimization,
  ExportFormat,
  ExportItem,
  Failure,
  ImportedContent,
  MenuType,
  Metadata,
  NativeWindowColors,
  NoteMenuPayload,
  ResolvedTheme,
  Result,
  Success,
  TitleBarOverlayOptions,
  ZoomAction,
};
