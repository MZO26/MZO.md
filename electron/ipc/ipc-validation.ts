import { registerElectronIpc } from "@electron/ipc/ipc-electron";
import { handleIpcError } from "@electron/ipc/ipc-error-handler";
import { registerFileIpc } from "@electron/ipc/ipc-fs";
import { registerNoteIpc } from "@electron/ipc/ipc-note";
import { registerSettingsIpc } from "@electron/ipc/ipc-settings";
import type { Result } from "@shared/types";
import { app, BrowserWindow, type IpcMainInvokeEvent } from "electron";

const APP_START_TIME = Date.now();
const ipcTimers = new Map<string, number>();

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
  registerElectronIpc(win);
  registerNoteIpc(win);
  registerSettingsIpc(win);
  registerFileIpc(win);
}

export { checkRateLimit, registerIpc, safeResponse };
