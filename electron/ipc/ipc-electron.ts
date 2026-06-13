import { setUpNoteMenu, setUpTableMenu } from "@electron/context-menu";
import { handleImageWrite } from "@electron/fs/fs-image";
import { getFilePath } from "@electron/fs/fs-mirror";
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
import { SyncRequestSchema } from "@shared/schemas/export-schema";
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

  ipcMain.handle("open:sync-path", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("open:sync-path", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (store.get("mirror-mode") !== true) return null;
      const validatedData = validation(SyncRequestSchema, payload);
      if (!validatedData.updated_at) return null;
      const targetDir = store.get("mirror-path");
      if (!targetDir) return null;
      const filePath = getFilePath(targetDir, validatedData);
      return shell.openPath(filePath.absoluteFilePath);
    });
  });

  ipcMain.handle("open:app-path", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("open:app-path", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const userDataPath = app.getPath("userData");
      return shell.openPath(userDataPath);
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
