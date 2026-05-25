import { setUpNoteMenu, setUpTableMenu } from "@electron/context-menu";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { checkRateLimit, result } from "@electron/ipc/ipc-validation";
import { getTitleBarOverlay, initTheme } from "@electron/titlebar";
import { AppErrorCode, LIMITS } from "@shared/constants";
import { type Theme } from "@shared/schemas/store-schema";
import type { MenuType, NoteMenuPayload } from "@shared/types";
import { BrowserWindow, ipcMain, Menu, Notification } from "electron";

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
}

export { registerElectronIpc };
