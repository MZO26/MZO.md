import { setUpNoteMenu, setUpTableMenu } from "@electron/context-menu";
import {
  getFilePath,
  resolveAutoExportPath,
} from "@electron/fs/fs-auto-export";
import { handleImageWriteMany } from "@electron/fs/fs-image";
import { processUrl } from "@electron/handler/navigation-handler";
import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { resolveAutoExport } from "@electron/ipc/ipc-helpers";
import {
  checkRateLimit,
  LIMITS,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { getTitleBarOverlay, initTheme } from "@electron/titlebar";
import { AppErrorCode } from "@shared/errors";
import {
  ExternalUrlSchema,
  MenuTypeSchema,
  NotificationSchema,
} from "@shared/schemas/electron-schema";
import { ImagePayloadsSchema } from "@shared/schemas/image-schema";
import { NoteMenuPayloadSchema } from "@shared/schemas/note-schema";
import { OpenAutoExportPathSchema } from "@shared/schemas/request-schema";
import { StoreSchema } from "@shared/schemas/store-schema";
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
    IPC_CHANNELS.SHOW_CONTEXT_MENU,
    (e, type: unknown, payload: unknown) => {
      return result(e, async () => {
        if (!checkRateLimit(IPC_CHANNELS.SHOW_CONTEXT_MENU, LIMITS.READ_LIGHT))
          throw new AppBackendError(AppErrorCode.RateLimitError);
        if (!win) return;
        const validMenuType = validation(MenuTypeSchema, type);
        let menu: Menu;
        if (validMenuType === "table") {
          menu = setUpTableMenu(win);
        } else if (validMenuType === "note") {
          const validatedData = validation(NoteMenuPayloadSchema, payload);
          menu = await setUpNoteMenu(win, validatedData);
        } else {
          return;
        }
        menu.popup({ window: win });
      });
    },
  );

  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, (e, url: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit(IPC_CHANNELS.OPEN_EXTERNAL, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ExternalUrlSchema, url);
      const decision = processUrl(validatedData);
      switch (decision) {
        case "allow":
          return shell.openPath(validatedData);
        case "external":
          return shell.openExternal(validatedData);
        case "block":
          return "block";
        default:
          decision satisfies never;
          return "block";
      }
    });
  });

  // opens note in default editor
  ipcMain.handle(IPC_CHANNELS.OPEN_DEFAULT_EDITOR, (e, payload: unknown) => {
    return result(e, async () => {
      if (
        !checkRateLimit(IPC_CHANNELS.OPEN_DEFAULT_EDITOR, LIMITS.READ_LIGHT)
      ) {
        throw new AppBackendError(AppErrorCode.RateLimitError);
      }
      const { targetDir, isAutoExport } = resolveAutoExport();
      if (!targetDir || !isAutoExport) return false;
      const validatedData = validation(OpenAutoExportPathSchema, payload);
      const autoExportPath = resolveAutoExportPath(targetDir);
      await fs.mkdir(autoExportPath, { recursive: true });
      const filePath = getFilePath(autoExportPath, validatedData);
      const error = await shell.openPath(filePath);
      return error === "";
    });
  });

  // opens auto-export directory and shows note
  ipcMain.handle(
    IPC_CHANNELS.OPEN_AUTO_EXPORT_FOLDER,
    (e, payload: unknown) => {
      return result(e, async () => {
        if (
          !checkRateLimit(
            IPC_CHANNELS.OPEN_AUTO_EXPORT_FOLDER,
            LIMITS.READ_LIGHT,
          )
        )
          throw new AppBackendError(AppErrorCode.RateLimitError);
        const { targetDir, isAutoExport } = resolveAutoExport();
        if (!targetDir || !isAutoExport) return false;
        const validatedData = validation(OpenAutoExportPathSchema, payload);
        if (!validatedData.updated_at) return false;
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
    },
  );

  // returns absolute file path ready to copy
  ipcMain.handle(IPC_CHANNELS.GET_AUTO_EXPORT_PATH, (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit(IPC_CHANNELS.GET_AUTO_EXPORT_PATH, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const { targetDir, isAutoExport } = resolveAutoExport();
      if (!targetDir || !isAutoExport) return null;
      const validatedData = validation(OpenAutoExportPathSchema, payload);
      if (!validatedData.updated_at) return null;
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

  ipcMain.handle(IPC_CHANNELS.OPEN_APP_PATH, (e) => {
    return result(e, async () => {
      if (!checkRateLimit(IPC_CHANNELS.OPEN_APP_PATH, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const userDataPath = app.getPath("userData");
      const error = await shell.openPath(userDataPath);
      if (error === "") return true;
      else return false;
    });
  });

  ipcMain.handle(
    IPC_CHANNELS.SET_THEME,
    (e, theme: unknown, focus?: unknown) => {
      return result(e, async () => {
        if (!checkRateLimit(IPC_CHANNELS.SET_THEME, LIMITS.WRITE_LIGHT))
          throw new AppBackendError(AppErrorCode.RateLimitError);
        const validTheme = validation(StoreSchema.shape["theme"], theme);
        const resolvedTheme = initTheme(validTheme);
        const isFocus = typeof focus === "boolean" && focus === true;
        const windowTheme = getTitleBarOverlay(resolvedTheme, isFocus);
        for (const window of BrowserWindow.getAllWindows()) {
          window.setBackgroundColor(windowTheme.backgroundColor);
          window.setTitleBarOverlay?.(windowTheme.overlayOptions);
        }
        return resolvedTheme;
      });
    },
  );

  ipcMain.handle(IPC_CHANNELS.APP_PIN, (e) => {
    return result(e, async () => {
      if (!checkRateLimit(IPC_CHANNELS.APP_PIN, LIMITS.WRITE_LIGHT))
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

  ipcMain.handle(
    IPC_CHANNELS.SHOW_NOTIFICATION,
    (e, title: unknown, body: unknown) => {
      return result(e, async () => {
        if (!checkRateLimit(IPC_CHANNELS.SHOW_NOTIFICATION, LIMITS.READ_LIGHT))
          throw new AppBackendError(AppErrorCode.RateLimitError);
        const validNotif = validation(NotificationSchema, { title, body });
        if (Notification.isSupported()) {
          const notif = new Notification(validNotif);
          notif.show();
        }
      });
    },
  );

  ipcMain.handle(IPC_CHANNELS.WRITE_IMAGE, (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit(IPC_CHANNELS.WRITE_IMAGE, LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ImagePayloadsSchema, payload);
      return await handleImageWriteMany(validatedData);
    });
  });
}

export { registerElectronIpc };
