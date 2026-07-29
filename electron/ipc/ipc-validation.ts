import { registerElectronIpc } from "@electron/ipc/ipc-electron";
import {
  AppBackendError,
  handleIpcError,
} from "@electron/ipc/ipc-error-handler";
import { registerNoteIpc } from "@electron/ipc/ipc-note";
import { registerSettingsIpc } from "@electron/ipc/ipc-settings";
import {
  APP_START_TIME,
  appError,
  IPC_TIMERS,
  RATE_LIMIT_DEFER_MS,
} from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import type { Result } from "@shared/types";
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
    appError("[IPC Sender Validation]: Blocked: IPC Without valid senderFrame");
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
  appError(`[IPC Sender Validation]: Blocked senderFrame: ${senderUrl.href}`);
  throw new AppBackendError(AppErrorCode.SenderError);
}

function checkRateLimit(channel: string, cooldownMs: number) {
  const now = Date.now();
  if (now - APP_START_TIME < RATE_LIMIT_DEFER_MS) {
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
    appError(
      "[IPC Validation]: Validation failed:",
      z.prettifyError(result.error),
    );
    throw result.error;
  }
  return result.data;
}

export { checkRateLimit, registerIpc, result, validateSender, validation };
