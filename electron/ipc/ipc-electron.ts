import { setUpNoteMenu, setUpTableMenu } from "@electron/context-menu";
import { getFilePath } from "@electron/fs/fs-auto-export";
import { handleImageWrite } from "@electron/fs/fs-image";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  checkRateLimit,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { store } from "@electron/store";
import { getTitleBarOverlay, initTheme } from "@electron/titlebar";
import { LIMITS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { ExternalUrlSchema } from "@shared/schemas/editor-schema";
import { OpenAutoExportPathSchema } from "@shared/schemas/export-schema";
import { ImagePayloadSchema } from "@shared/schemas/image-schema";
import { type Theme } from "@shared/schemas/store-schema";
import type { MenuType, NoteMenuPayload } from "@shared/types";
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
  ipcMain.on(
    "context-menu:show",
    (e, menuType: MenuType, payload: NoteMenuPayload) => {
      return result(e, async () => {
        if (!checkRateLimit("context-menu:show", LIMITS.READ_LIGHT))
          throw new AppBackendError(AppErrorCode.RateLimitError);
        if (!win) return;
        let menu: Menu;
        if (menuType === "table") {
          menu = setUpTableMenu(win);
        } else if (menuType === "note") {
          menu = setUpNoteMenu(win, payload);
        } else {
          return;
        }
        menu.popup({ window: win });
      });
    },
  );

  ipcMain.handle("open:external", (e, url: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("open:external", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedUrl = validation(ExternalUrlSchema, url);
      return shell.openExternal(validatedUrl);
    });
  });

  // opens auto-export directory and shows note
  ipcMain.handle("open:auto-export-folder", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("open:auto-export-folder", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (store.get("auto-export") !== true) return null;
      const validatedData = validation(OpenAutoExportPathSchema, payload);
      if (!validatedData.updated_at) return null;
      const targetDir = store.get("auto-export-path");
      if (!targetDir) return null;
      const filePath = getFilePath(targetDir, validatedData);
      try {
        await fs.access(filePath.absoluteFilePath, fs.constants.R_OK);
        shell.showItemInFolder(filePath.absoluteFilePath);
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
        else throw new AppBackendError(AppErrorCode.InvalidData);
      }
    });
  });

  // returns absolute file path ready to copy
  ipcMain.handle("get:auto-export-path", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("get:auto-export-path", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (store.get("auto-export") !== true) return null;
      const validatedData = validation(OpenAutoExportPathSchema, payload);
      if (!validatedData.updated_at) return null;
      const targetDir = store.get("auto-export-path");
      if (!targetDir) return null;
      const filePath = getFilePath(targetDir, validatedData);
      try {
        await fs.access(filePath.absoluteFilePath, fs.constants.R_OK);
        return filePath.absoluteFilePath;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
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

  ipcMain.handle("notification:show", (e, title: string, body: string) => {
    return result(e, async () => {
      if (!checkRateLimit("notification:show", LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (Notification.isSupported()) {
        const notif = new Notification({
          title,
          body,
        });
        notif.show();
      }
    });
  });
  ipcMain.handle("image:write", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("image:write", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ImagePayloadSchema, payload);
      return await handleImageWrite(validatedData);
    });
  });
}

export { registerElectronIpc };
