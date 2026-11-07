import { IS_DEV_MAIN, mainLogger } from "@electron/handler/permission-handler";
import type { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import { registerElectronIpc } from "@electron/ipc/ipc-electron";
import { registerNoteIpc } from "@electron/ipc/ipc-note";
import { registerSettingsIpc } from "@electron/ipc/ipc-settings";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import type { Result, ValueOf } from "@shared/shared-types";
import { BrowserWindow, app, type IpcMainInvokeEvent } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import z, { ZodError } from "zod";

function registerIpc(win: BrowserWindow) {
  registerElectronIpc(win);
  registerNoteIpc(win);
  registerSettingsIpc(win);
}

/**
 * Wraps an async function to return a {@link Result} instead of throwing.
 *
 * - `AppBackendError` → its `.code` is propagated.
 * - `ZodError` → mapped to `AppErrorCode.InvalidData`.
 * - Anything else → logged and mapped to `AppErrorCode.UnknownError`.
 *
 * @param fn - The async function to guard.
 * @returns A function with the same signature that resolves to `Result<T>`.
 *
 * @example
 * const safeFetch = withErrorHandling(fetchNote);
 * const res = await safeFetch(id);
 * if (res.success) render(res.data);
 * else show(res.error);
 */

function withErrorHandling<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
) {
  return async (...args: A): Promise<Result<T>> => {
    try {
      const data = await fn(...args);
      return { success: true, data };
    } catch (error: unknown) {
      if (error instanceof AppBackendError) {
        return {
          success: false,
          error: error.code,
        };
      }
      if (error instanceof ZodError) {
        return {
          success: false,
          error: AppErrorCode.InvalidData,
        };
      }
      mainLogger.appError("[IPC Unknown Error]:", error);
      return {
        success: false,
        error: AppErrorCode.UnknownError,
      };
    }
  };
}

const ALLOWED_DEV_ORIGINS = new Set(["http://localhost:5173"]);

const APP_ROOT_PATH = path.resolve(app.getAppPath());

/**
 * Validates that an IPC invoke request originates from a trusted sender.
 *
 * Checks (in order):
 * 1. The sender frame exists and is the main frame.
 * 2. The sender belongs to a recognized `BrowserWindow`.
 * 3. The sender URL is well-formed.
 * 4. The origin is allowed:
 *    - Dev builds: any origin in `ALLOWED_DEV_ORIGINS`.
 *    - `file:` protocol: path must resolve within `APP_ROOT_PATH`.
 *    - `appimg://bundle`: custom app protocol (always allowed).
 *
 * All failures are logged and throw an {@link AppBackendError}.
 *
 * @param event - The IPC invoke event from the renderer.
 * @returns `true` if the sender is trusted.
 * @throws {AppBackendError} If any validation check fails.
 *
 * @example
 * ipcMain.handle("notes:save", (event, payload) => {
 *   validateSender(event);
 *   // … safe to proceed
 * });
 */

function validateSender(event: IpcMainInvokeEvent) {
  const frame = event.frameId ? event.senderFrame : null;
  if (!frame || frame !== event.sender.mainFrame) {
    mainLogger.appError(
      "[IPC Sender Validation]: Blocked: Missing frame or non-mainFrame sender",
    );
    throw new AppBackendError(AppErrorCode.SenderError);
  }
  const mainWindow = BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow) {
    mainLogger.appError(
      "[IPC Sender Validation]: Blocked: Sender is not a recognized BrowserWindow",
    );
    throw new AppBackendError(AppErrorCode.SenderError);
  }
  let senderUrl: URL;
  try {
    senderUrl = new URL(frame.url);
  } catch {
    mainLogger.appError(
      `[IPC Sender Validation]: Blocked: Malformed URL "${frame.url}"`,
    );
    throw new AppBackendError(AppErrorCode.SenderError);
  }
  if (!app.isPackaged && ALLOWED_DEV_ORIGINS.has(senderUrl.origin)) return true;
  if (senderUrl.protocol === "file:") {
    try {
      const filePath = path.resolve(fileURLToPath(senderUrl));
      if (
        filePath.startsWith(APP_ROOT_PATH + path.sep) ||
        filePath === APP_ROOT_PATH
      ) {
        return true;
      }
    } catch {}
  }
  if (senderUrl.protocol === "appimg:" && senderUrl.host === "bundle")
    return true;
  mainLogger.appError(
    `[IPC Sender Validation]: Blocked senderFrame: ${senderUrl.href}`,
  );
  throw new AppBackendError(AppErrorCode.SenderError);
}

const IPC_TIMERS = new Map<string, number>();

const LIMITS = {
  WRITE_HEAVY: 500,
  WRITE_STANDARD: 300,
  WRITE_LIGHT: 100,
  READ_HEAVY: 500,
  READ_NORMAL: 300,
  READ_LIGHT: 100,
  WRITE_FLUSH: 5,
} as const;

/** Timestamp (ms) captured at application startup. */

const APP_START_TIME = Date.now();

/**
 * Checks whether an IPC channel call is within the allowed rate limit.
 *
 * Bypassed entirely in dev builds and during the first 5 seconds after
 * app start (startup grace period). Otherwise enforces a per-channel
 * cooldown tracked in `IPC_TIMERS`.
 *
 * @param channel - The IPC channel name being invoked.
 * @param cooldownMs - Minimum interval between calls to this channel (ms).
 * @returns `true` if the call is allowed, `false` if rate-limited.
 *
 * @example
 * if (!checkRateLimit(IPC_CHANNELS.NOTE_SAVE, LIMITS.NOTE_SAVE)) return;
 */

function checkRateLimit(
  channel: ValueOf<typeof IPC_CHANNELS>,
  cooldownMs: ValueOf<typeof LIMITS>,
) {
  if (IS_DEV_MAIN) return true;
  const now = Date.now();
  if (now - APP_START_TIME < 5000) {
    return true;
  }
  const lastCall = IPC_TIMERS.get(channel) || 0;
  if (now - lastCall < cooldownMs) return false;
  IPC_TIMERS.set(channel, now);
  return true;
}

/**
 * Validates an untrusted payload against a Zod schema.
 *
 * On failure, logs the prettified error and re-throws the `ZodError`.
 * On success, returns the parsed (and narrowed) data.
 *
 * @param schema - The Zod schema to validate against.
 * @param payload - The untrusted input (e.g. from IPC).
 * @returns The validated, typed data.
 * @throws {ZodError} If validation fails.
 *
 * @example
 * const safe = validation(NoteCreateSchema, rawPayload); // NoteCreate
 */

function validation<T extends z.ZodType>(schema: T, payload: unknown) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    mainLogger.appError(
      "[Validation]: Validation failed:",
      z.prettifyError(result.error),
    );
    throw result.error;
  }
  return result.data;
}

export {
  LIMITS,
  checkRateLimit,
  registerIpc,
  validateSender,
  validation,
  withErrorHandling,
};
