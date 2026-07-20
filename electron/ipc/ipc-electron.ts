import { setUpNoteMenu, setUpTableMenu } from "@electron/context-menu";
import {
  getFilePath,
  resolveAutoExportPath,
} from "@electron/fs/fs-auto-export";
import { handleImageWriteMany } from "@electron/fs/fs-image";
import { processUrl } from "@electron/handler/navigation-handler";
import { settingsService } from "@electron/handler/settings-handler";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  checkRateLimit,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { getTitleBarOverlay, initTheme } from "@electron/titlebar";
import { LIMITS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { ExternalUrlSchema } from "@shared/schemas/editor-schema";
import { ImagePayloadsSchema } from "@shared/schemas/image-schema";
import { NoteMenuPayloadSchema } from "@shared/schemas/note-schema";
import {
  NotificationSchema,
  OpenAutoExportPathSchema,
} from "@shared/schemas/request-schema";
import { type Theme } from "@shared/schemas/store-schema";
import type { MenuType } from "@shared/types";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  shell,
} from "electron";
import fs from "fs/promises";

function registerElectronIpc(win: BrowserWindow) {
  ipcMain.on("context-menu:show", (e, menuType: MenuType, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("context-menu:show", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (!win) return;
      let menu: Menu;
      if (menuType === "table") {
        menu = setUpTableMenu(win);
      } else if (menuType === "note") {
        const validatedData = validation(NoteMenuPayloadSchema, payload);
        menu = await setUpNoteMenu(win, validatedData);
      } else {
        return;
      }
      menu.popup({ window: win });
    });
  });

  ipcMain.handle("open:external", (e, url: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("open:external", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ExternalUrlSchema, url);
      const decision = processUrl(validatedData);
      switch (decision) {
        case "allow":
          return shell.openPath(validatedData);
        case "external":
          return shell.openExternal(validatedData);
        case "block":
        default:
          return "block";
      }
    });
  });

  // opens note in default editor
  ipcMain.handle("open:default-editor", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("open:default-editor", LIMITS.READ_LIGHT)) {
        throw new AppBackendError(AppErrorCode.RateLimitError);
      }
      const settings = settingsService.getSettings();
      if (settings["auto_export"] !== true) return false;
      const validatedData = validation(OpenAutoExportPathSchema, payload);
      const targetDir = settings["auto_export_path"];
      if (!targetDir) return false;
      const autoExportPath = resolveAutoExportPath(targetDir);
      await fs.mkdir(autoExportPath, { recursive: true });
      const filePath = getFilePath(autoExportPath, validatedData);
      const error = await shell.openPath(filePath);
      return error === "";
    });
  });

  // opens auto-export directory and shows note
  ipcMain.handle("open:auto-export-folder", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("open:auto-export-folder", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const settings = settingsService.getSettings();
      if (settings["auto_export"] !== true) return false;
      const validatedData = validation(OpenAutoExportPathSchema, payload);
      if (!validatedData.updated_at) return false;
      const targetDir = settings["auto_export_path"];
      if (!targetDir) return false;
      const autoExportPath = resolveAutoExportPath(targetDir);
      await fs.mkdir(autoExportPath, { recursive: true });
      const filePath = getFilePath(autoExportPath, validatedData);
      try {
        await fs.access(filePath, fs.constants.R_OK);
        shell.showItemInFolder(filePath);
        return true;
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") return false;
        else throw new AppBackendError(AppErrorCode.InvalidData);
      }
    });
  });

  // returns absolute file path ready to copy
  ipcMain.handle("get:auto-export-path", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("get:auto-export-path", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const settings = settingsService.getSettings();
      if (settings["auto_export"] !== true) return null;
      const validatedData = validation(OpenAutoExportPathSchema, payload);
      if (!validatedData.updated_at) return null;
      const targetDir = settings["auto_export_path"];
      if (!targetDir) return null;
      const autoExportPath = resolveAutoExportPath(targetDir);
      await fs.mkdir(autoExportPath, { recursive: true });
      const filePath = getFilePath(autoExportPath, validatedData);
      try {
        await fs.access(filePath, fs.constants.R_OK);
        return filePath;
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") return null;
        else throw new AppBackendError(AppErrorCode.InvalidData);
      }
    });
  });

  ipcMain.handle("open:app-path", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("open:app-path", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const userDataPath = app.getPath("userData");
      const error = await shell.openPath(userDataPath);
      if (error === "") return true;
      else return false;
    });
  });

  ipcMain.handle("theme:set", (e, theme: Theme, focus?: boolean) => {
    return result(e, async () => {
      if (!checkRateLimit("theme:set", LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const resolvedTheme = initTheme(theme);
      const windowTheme = getTitleBarOverlay(resolvedTheme, focus ?? false);
      for (const window of BrowserWindow.getAllWindows()) {
        window.setBackgroundColor(windowTheme.backgroundColor);
        window.setTitleBarOverlay?.(windowTheme.overlayOptions);
      }
      return resolvedTheme;
    });
  });

  ipcMain.handle("app:pin", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("app:pin", LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (win && !win.isDestroyed()) {
        const isCurrentlyPinned = win.isAlwaysOnTop();
        const nextState = !isCurrentlyPinned;
        if (win.isMinimized()) {
          win.restore();
        }
        win.setAlwaysOnTop(nextState, "floating");
        if (process.platform === "darwin") {
          win.setVisibleOnAllWorkspaces(nextState, {
            visibleOnFullScreen: nextState,
          });
        }
        return nextState;
      }
      return false;
    });
  });

  ipcMain.handle("notification:show", (e, title: unknown, body: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("notification:show", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validNotif = validation(NotificationSchema, { title, body });
      if (Notification.isSupported()) {
        const notif = new Notification(validNotif);
        notif.show();
      }
    });
  });

  ipcMain.handle("image:write-many", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("image:write-many", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ImagePayloadsSchema, payload);
      return await handleImageWriteMany(validatedData);
    });
  });
}

export { registerElectronIpc };
