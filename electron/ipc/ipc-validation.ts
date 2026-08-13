import { IS_DEV_MAIN, mainLogger } from "@electron/handler/permission-handler";
import type { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import { registerElectronIpc } from "@electron/ipc/ipc-electron";
import {
  AppBackendError,
  handleIpcError,
} from "@electron/ipc/ipc-error-handler";
import { registerNoteIpc } from "@electron/ipc/ipc-note";
import { registerSettingsIpc } from "@electron/ipc/ipc-settings";
import { AppErrorCode } from "@shared/errors";
import type { Result, ValueOf } from "@shared/shared-types";
import { BrowserWindow, app, type IpcMainInvokeEvent } from "electron";
import z from "zod";

function registerIpc(win: BrowserWindow) {
  registerElectronIpc(win);
  registerNoteIpc(win);
  registerSettingsIpc(win);
}

async function result<T>(
  event: IpcMainInvokeEvent,
  action: () => Promise<T>,
): Promise<Result<T>> {
  try {
    validateSender(event);
    const data = await action();
    return { success: true, data };
  } catch (error: unknown) {
    return handleIpcError(error);
  }
}

function validateSender(event: IpcMainInvokeEvent) {
  if (!event.senderFrame) {
    mainLogger.appError(
      "[IPC Sender Validation]: Blocked: IPC Without valid senderFrame",
    );
    throw new AppBackendError(AppErrorCode.SenderError);
  }
  const mainWindow = BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow) {
    throw new AppBackendError(AppErrorCode.SenderError);
  }
  const senderUrl = new URL(event.senderFrame.url);
  if (!app.isPackaged) {
    const allowedDevOrigins = ["http://localhost:5173"];
    if (allowedDevOrigins.includes(senderUrl.origin)) {
      return true;
    }
  }
  const allowedProtocols = ["appimg:", "file:"];
  if (allowedProtocols.includes(senderUrl.protocol)) {
    return true;
  }
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

const APP_START_TIME = Date.now();

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

function validation<T extends z.ZodType>(schema: T, payload: unknown) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    mainLogger.appError(
      "[IPC Validation]: Validation failed:",
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
  result,
  validateSender,
  validation,
};
