import type { AppErrorCode } from "@shared/errors";
import type { Theme } from "@shared/schemas/store-schema";
import type {
  ALLOWED_IMPORT_EXTENSIONS,
  APP_EVENTS,
  TABLE_ACTIONS,
} from "@shared/shared-constants";

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

type AppEvent = ValueOf<typeof APP_EVENTS>;

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
  Failure,
  ImportExtension,
  ImportStats,
  NativeWindowColors,
  PDFAssets,
  ResolvedTheme,
  Result,
  Success,
  TableAction,
  UrlDecision,
  ValueOf,
};
