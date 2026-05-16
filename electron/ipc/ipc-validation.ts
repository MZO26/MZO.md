import { registerElectronIpc } from "@electron/ipc/ipc-electron";
import { registerFileIpc } from "@electron/ipc/ipc-fs";
import { registerNoteIpc } from "@electron/ipc/ipc-note";
import { registerSettingsIpc } from "@electron/ipc/ipc-settings";
import type { Failure, Result } from "@shared/types";
import { app, BrowserWindow, type IpcMainInvokeEvent } from "electron";
import z, { ZodError } from "zod";

enum AppError {
  DBError = "NOT_FOUND",
  RateLimitError = "RATE_LIMIT",
  SenderError = "UNAUTHORIZED_SENDER",
  UnknownError = "UNKNOWN_ERROR",
  InvalidViewError = "INVALID_VIEW",
  CancelledOperation = "CANCELLED_OPERATION",
  CompressionError = "COMPRESSION_ERROR",
  InvalidImageError = "INVALID_IMAGE_ERROR",
}

function validateSender(event: IpcMainInvokeEvent) {
  if (!event.senderFrame) {
    console.error("Blocked: IPC Without valid senderFrame");
    throw new Error("UNAUTHORIZED_SENDER");
  }
  const mainWindow = BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow) {
    throw new Error("UNAUTHORIZED_SENDER");
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
  throw new Error("UNAUTHORIZED_SENDER");
}

async function safeResponse<T>(
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

function handleIpcError(err: unknown): Failure {
  if (err instanceof ZodError) {
    console.error(
      "[IPC Validation]: ",
      JSON.stringify(z.treeifyError(err), null, 2),
    );
    return { success: false, message: "Invalid data provided." };
  }
  // check if it's an error object and show the message in console for debugging. If it's no error object, just return the string
  const errorCode =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : AppError.UnknownError;
  console.error("[IPC]: ", errorCode);

  switch (errorCode) {
    case AppError.SenderError:
      return { success: false, message: "Unauthorized request." };

    case AppError.RateLimitError:
      return {
        success: false,
        message: "Too many requests. Please try again.",
      };

    case AppError.DBError:
      return { success: false, message: "Requested item could not be found." };

    case AppError.InvalidViewError:
      return { success: false, message: "View not found." };

    case AppError.CancelledOperation:
      return { success: false, message: "Operation cancelled." };

    case AppError.CompressionError:
      return { success: false, message: "Failed to process the image." };

    case AppError.InvalidImageError:
      return { success: false, message: "Image is damaged or unsupported" };

    case AppError.UnknownError:
    default:
      return { success: false, message: "Unknown error occurred." };
  }
}

const APP_START_TIME = Date.now();
const ipcTimers = new Map<string, number>();

function checkRateLimit(channel: string, cooldownMs: number): boolean {
  const now = Date.now();

  if (now - APP_START_TIME < 5000) {
    return true;
  }
  const lastCall = ipcTimers.get(channel) || 0;

  if (now - lastCall < cooldownMs) {
    console.warn(
      `[RATE LIMIT BLOCKED] Channel: "${channel}" | ` +
        `Required: ${cooldownMs}ms`,
    );
    return false;
  }

  ipcTimers.set(channel, now);
  return true;
}

function registerIpc(win: BrowserWindow) {
  registerElectronIpc();
  registerNoteIpc();
  registerSettingsIpc(win);
  registerFileIpc(win);
}

export { checkRateLimit, registerIpc, safeResponse };
