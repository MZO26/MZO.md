import type { IpcResponse } from "@shared/types";
import { app, type IpcMainInvokeEvent } from "electron";
import z, { ZodError } from "zod";

enum AppError {
  DBError = "NOT_FOUND",
  RateLimitError = "RATE_LIMIT",
  SenderError = "UNAUTHORIZED_SENDER",
  UnknownError = "UNKNOWN_ERROR",
  InvalidViewError = "INVALID_VIEW",
}

function validateSender(event: IpcMainInvokeEvent) {
  if (!event.senderFrame) {
    console.error("Blocked: IPC Without valid senderFrame");
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

async function wrapResult<T>(
  event: IpcMainInvokeEvent,
  action: () => Promise<T>,
): Promise<IpcResponse<T>> {
  try {
    validateSender(event);
    const data = await action();
    return { success: true, data };
  } catch (err: unknown) {
    return handleIpcError(err);
  }
}

function handleIpcError(err: unknown): { success: false; message: string } {
  if (err instanceof ZodError) {
    console.error("[IPC Validation]: ", z.treeifyError(err));
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

    case AppError.UnknownError:
    default:
      return { success: false, message: "An unexpected error occurred." };
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

export { checkRateLimit, wrapResult };
