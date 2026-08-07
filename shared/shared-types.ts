import type { AppErrorCode } from "@shared/errors";
import type { Theme } from "@shared/schemas/store-schema";
import type { ALLOWED_IMPORT_EXTENSIONS } from "@shared/shared-constants";

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
type ValueOf<T> = T[keyof T];

type UrlDecision = "allow" | "block" | "external";

type ResolvedTheme = Extract<Theme, "light" | "dark">;
type TableAction =
  | "addRowBefore"
  | "addRowAfter"
  | "addColumnBefore"
  | "addColumnAfter"
  | "deleteRow"
  | "deleteColumn"
  | "deleteTable";
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

export type {
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
