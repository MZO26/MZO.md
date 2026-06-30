import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  checkRateLimit,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { store } from "@electron/store";
import { nextZoom } from "@electron/win";
import { LIMITS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { StoreSchema } from "@shared/schemas/store-schema";
import type { ZoomAction } from "@shared/types";
import { BrowserWindow, ipcMain } from "electron";

function registerSettingsIpc(win: BrowserWindow) {
  ipcMain.handle("zoom", (e, action: ZoomAction) => {
    return result(e, async () => {
      if (!checkRateLimit("zoom", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const current = win.webContents.getZoomFactor();
      const zoom = nextZoom(current, action);
      if (action !== "get") {
        win.webContents.setZoomFactor(zoom);
      }
      return zoom;
    });
  });

  ipcMain.handle("electron-store:get", (e, key: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("electron-store:get", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const safeKey = validation(StoreSchema.keyof(), key);
      const value = store.get(safeKey);
      const keySchema = StoreSchema.shape[safeKey];
      return validation(keySchema, value);
    });
  });

  ipcMain.handle("electron-store:getAll", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("electron-store:getAll", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      return validation(StoreSchema, store.store);
    });
  });

  ipcMain.handle("electron-store:set", (e, settings: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("electron-store:set", LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validSettings = validation(StoreSchema.partial(), settings);
      const currentSettings = store.store;
      const mergedSettings = {
        ...currentSettings,
        ...validSettings,
      };
      const validValue = validation(StoreSchema, mergedSettings);
      store.set(validValue);
      win.webContents.send("settings-changed", validValue);
      return validValue;
    });
  });
}

export { registerSettingsIpc };
