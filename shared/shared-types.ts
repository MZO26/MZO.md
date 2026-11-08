import type { AppErrorCode } from "@shared/errors";
import type { Theme } from "@shared/schemas/store-schema";
import type {
  ALLOWED_IMPORT_EXTENSIONS,
  APP_EVENTS,
  EDITOR_EVENTS,
  SETTING_EVENTS,
  TABLE_ACTIONS,
} from "@shared/shared-constants";
import type { Editor } from "@tiptap/core";

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
  focus?: boolean;
};

type NativeWindowColors = {
  backgroundColor: string;
  overlayOptions: TitleBarOverlayOptions;
};

type ResolvedTheme = Extract<Theme, "light" | "dark">;

type TableAction = ValueOf<typeof TABLE_ACTIONS>;

type AppEvent = ValueOf<typeof APP_EVENTS> | ValueOf<typeof EDITOR_EVENTS>;

interface EditorCommands {
  run: (args: Editor) => boolean | Promise<boolean>;
  isActive?: (args: Editor) => boolean;
  isDisabled?: (args: Editor) => boolean;
  label: keyof typeof EDITOR_EVENTS;
}

interface SettingCommands {
  run: () => void | Promise<void>;
  isActive?: () => boolean;
  label: keyof typeof SETTING_EVENTS;
}

type Success<T> = {
  success: true;
  data: T;
};

type Failure<E = AppErrorCode> = {
  success: false;
  error: E;
};

type Result<T, E = AppErrorCode> = Success<T> | Failure<E>;

type ImportStats = {
  total: number;
  duplicates: number;
  errors: number;
};

type PDFAssets = { template: string; css: string };

type ImportExtension = (typeof ALLOWED_IMPORT_EXTENSIONS)[number];

type ValueOf<T> = T[keyof T];

export type {
  AppEvent,
  EditorCommands,
  ImportExtension,
  ImportStats,
  NativeWindowColors,
  PDFAssets,
  ResolvedTheme,
  Result,
  SettingCommands,
  TableAction,
  ValueOf,
};
