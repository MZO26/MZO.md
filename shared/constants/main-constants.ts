import type { Theme } from "@shared/schemas/store-schema";

const SYNC_BUFFER = 2000; // 2 seconds to account for DB timestamp differences or OS write delays

const LIMITS = {
  WRITE_HEAVY: 500,
  WRITE_STANDARD: 300,
  WRITE_LIGHT: 100,
  READ_HEAVY: 500,
  READ_NORMAL: 300,
  READ_LIGHT: 100,
  WRITE_FLUSH: 5,
};

const APP_START_TIME = Date.now();

const RATE_LIMIT_DEFER_MS = 5000;

const IPC_TIMERS = new Map<string, number>();

const ZOOMS = [1, 1.1, 1.25] as const;

const MAX_IPC_PAYLOAD_SIZE = 3_000_000;

const CONCURRENCY_EXPORT_NORMAL = 3;

const CONCURRENCY_IMPORT = 3;

const CONCURRENCY_EXPORT_PDF = 1;

const CONCURRENCY_DELETE = 2;

const CONCURRENCY_IMAGE = 5;

const THEME_DATA: Record<
  Exclude<Theme, "system">,
  {
    color: string;
    symbolColor: string;
    background: string;
    isDark: boolean;
    focus: string;
  }
> = {
  light: {
    color: "#fcfcfc", // --bg-sidebar
    symbolColor: "#18181b", // --text-main
    background: "#fcfcfc", // --bg-sidebar
    isDark: false,
    focus: "#fcfcfc", // --bg-editor
  },
  dark: {
    color: "#1d1d20", // --bg-sidebar
    symbolColor: "#a1a1aa", // --text-muted
    background: "#1d1d20", // --bg-sidebar
    isDark: true,
    focus: "#1d1d20", // --bg-editor
  },
  light_warm: {
    color: "#f8f7f3", // --bg-sidebar
    symbolColor: "#5e5b56", // --text-muted
    background: "#f8f7f3", // --bg-editor
    isDark: false,
    focus: "#f8f7f3", // --bg-editor
  },
  dark_warm: {
    color: "#1e1b17", // --bg-sidebar
    symbolColor: "#9e9890", // --text-muted
    background: "#1e1b17", // --bg-sidebar
    isDark: true,
    focus: "#1e1b17", // --bg-editor
  },
} as const;

export {
  APP_START_TIME,
  CONCURRENCY_DELETE,
  CONCURRENCY_EXPORT_NORMAL,
  CONCURRENCY_EXPORT_PDF,
  CONCURRENCY_IMAGE,
  CONCURRENCY_IMPORT,
  IPC_TIMERS,
  LIMITS,
  MAX_IPC_PAYLOAD_SIZE,
  RATE_LIMIT_DEFER_MS,
  SYNC_BUFFER,
  THEME_DATA,
  ZOOMS,
};
