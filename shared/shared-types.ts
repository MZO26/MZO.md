import type { AppErrorCode } from "@shared/errors";
import type { Theme } from "@shared/schemas/store-schema";
import type {
  ALLOWED_IMPORT_EXTENSIONS,
  APP_EVENTS,
  EDITOR_EVENTS,
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

type UrlDecision = "allow" | "block" | "external";

type ResolvedTheme = Extract<Theme, "light" | "dark">;

type TableAction = ValueOf<typeof TABLE_ACTIONS>;

type AppEvent = ValueOf<typeof APP_EVENTS> | ValueOf<typeof EDITOR_EVENTS>;

type PayloadOverrides = {
  [APP_EVENTS.APPLY_VIEW]: string;
};

interface EditorCommands {
  run: (args: Editor) => boolean | Promise<boolean>;
  isActive?: (args: Editor) => boolean;
  isDisabled?: (args: Editor) => boolean;
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

type ContentType = ImportExtension;

type ValueOf<T> = T[keyof T];

export type {
  AppEvent,
  ContentType,
  EditorCommands,
  Failure,
  ImportExtension,
  ImportStats,
  NativeWindowColors,
  PayloadOverrides,
  PDFAssets,
  ResolvedTheme,
  Result,
  Success,
  TableAction,
  UrlDecision,
  ValueOf,
};
