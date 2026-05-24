import {
  AppBackendError,
  handleIpcError,
} from "@electron/ipc/ipc-error-handler";
import { APP_START_TIME, AppErrorCode, ipcTimers } from "@shared/constants";
import type { Result } from "@shared/types";
import { BrowserWindow, app, type IpcMainInvokeEvent } from "electron";
import type z from "zod";

async function result<T>(
  event: IpcMainInvokeEvent,
  action: () => Promise<T>,
): Promise<Result<T>> {
  try {
    validateSender(event);
    const data = await action();
    return { success: true, data };
  } catch (err: unknown) {
    return handleIpcError(err);
  }
}

function validateSender(event: IpcMainInvokeEvent) {
  if (!event.senderFrame) {
    console.error("Blocked: IPC Without valid senderFrame");
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
  console.error(`Blocked senderFrame: ${senderUrl.href}`);
  throw new AppBackendError(AppErrorCode.SenderError);
}

function checkRateLimit(channel: string, cooldownMs: number) {
  const now = Date.now();
  if (now - APP_START_TIME < 5000) {
    return true;
  }
  const lastCall = ipcTimers.get(channel) || 0;
  if (now - lastCall < cooldownMs) return false;
  ipcTimers.set(channel, now);
  return true;
}

function validation<T extends z.ZodType>(
  schema: T,
  payload: unknown,
): z.infer<T> {
  const validate = schema.safeParse(payload);
  if (!validate.success) {
    console.error(
      "Validation failed:",
      JSON.stringify(validate.error, null, 2),
    );
    console.dir(validate.error.issues, { depth: null });
    throw validate.error;
  }
  return validate.data;
}

function measure<T>(fn: () => T) {
  const start = performance.now();
  fn();
  const end = performance.now();
  return Math.round((end - start) * 100) / 100;
}

export { checkRateLimit, measure, result, validateSender, validation };
