import { settingsService } from "@electron/handler/settings-handler";
import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import {
  checkRateLimit,
  LIMITS,
  validateSender,
  validation,
  withErrorHandling,
} from "@electron/ipc/ipc-validation";
import { getClosestZoom, nextZoom } from "@electron/win";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import { ZoomActionSchema } from "@shared/schemas/electron-schema";
import { StoreSchema } from "@shared/schemas/store-schema";
import { type BrowserWindow, ipcMain } from "electron";

function registerSettingsIpc(win: BrowserWindow) {
  ipcMain.handle(
    IPC_CHANNELS.APP_ZOOM,
    withErrorHandling((e, action: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.APP_ZOOM, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validAction = validation(ZoomActionSchema, action);
      const rawCurrent = win.webContents.getZoomFactor();
      const current = getClosestZoom(rawCurrent);
      const zoom = nextZoom(current, validAction);
      if (validAction !== "get") {
        win.webContents.setZoomFactor(zoom);
      }
      return zoom;
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_SETTING,
    withErrorHandling((e, key: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.GET_SETTING, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const safeKey = validation(StoreSchema.keyof(), key);
      return settingsService.get(safeKey);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_ALL_SETTINGS,
    withErrorHandling((e) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.GET_ALL_SETTINGS, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const result = settingsService.getSettings();
      return validation(StoreSchema, result);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.SET_SETTING,
    withErrorHandling((e, settings: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.SET_SETTING, LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validSettings = validation(StoreSchema.partial(), settings);
      const currentSettings = settingsService.getSettings();
      const mergedSettings = {
        ...currentSettings,
        ...validSettings,
      };
      const validValue = validation(StoreSchema, mergedSettings);
      settingsService.updateSettings(validValue);
      return validValue;
    }),
  );
}

export { registerSettingsIpc };
