import type { Content } from "@tiptap/core";

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

type Failure = Extract<Result<unknown>, { success: false }>;

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

interface BatchExportData {
  id: string;
  title: string;
  markdown?: string;
  plainText?: string;
  content?: string;
}

type BatchExportExtensions = "md" | "txt" | "json";

type ContentType = "markdown" | "html" | "json";

type ZoomAction = "get" | "in" | "out" | "reset";

type DbOptimization = "optimize-db" | "vacuum-db" | "backup-db";

type DBBackupResult = {
  totalPages: number;
  remainingPages: number;
};

export type {
  Action,
  ActionMap,
  BatchExportData,
  BatchExportExtensions,
  Code,
  ContentType,
  DBBackupResult,
  DbOptimization,
  Failure,
  ImportedContent,
  Metadata,
  NativeWindowColors,
  ResolvedTheme,
  Result,
  Success,
  TitleBarOverlayOptions,
  ZoomAction,
};
