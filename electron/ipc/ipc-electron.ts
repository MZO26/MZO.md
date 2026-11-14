import { setUpNoteMenu, setUpTableMenu } from "@electron/context-menu";
import { handleImageWriteMany } from "@electron/fs/fs-image";
import { processUrl } from "@electron/handler/navigation-handler";
import { mainLogger } from "@electron/handler/permission-handler";
import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import {
  checkRateLimit,
  LIMITS,
  validateSender,
  validation,
  withErrorHandling,
} from "@electron/ipc/ipc-validation";
import { getTitleBarOverlay, initTheme } from "@electron/titlebar";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import {
  ExternalUrlSchema,
  MenuTypeSchema,
  NotificationSchema,
} from "@shared/schemas/electron-schema";
import { ImagePayloadsSchema } from "@shared/schemas/image-schema";
import { NoteMenuPayloadSchema } from "@shared/schemas/note-schema";
import { StoreSchema } from "@shared/schemas/store-schema";
import { app, BrowserWindow, ipcMain, type Menu, Notification, shell } from "electron";

function registerElectronIpc() {
  ipcMain.on(
    IPC_CHANNELS.SHOW_CONTEXT_MENU,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    withErrorHandling((e, type: unknown, payload: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.SHOW_CONTEXT_MENU, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validMenuType = validation(MenuTypeSchema, type);
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win) return;
      let menu: Menu;
      if (validMenuType === "table") {
        menu = setUpTableMenu(win);
      } else if (validMenuType === "note") {
        const validatedData = validation(NoteMenuPayloadSchema, payload);
        menu = setUpNoteMenu(win, validatedData);
      } else {
        return;
      }
      menu.popup({ window: win });
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.OPEN_EXTERNAL,
    withErrorHandling(async (e, url: unknown) => {
      validateSender(e);
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
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.OPEN_APP_PATH,
    withErrorHandling(async (e) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.OPEN_APP_PATH, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const userDataPath = app.getPath("userData");
      const error = await shell.openPath(userDataPath);
      if (error === "") return true;
      else return false;
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.SET_THEME,
    withErrorHandling((e, theme: unknown, focus?: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.SET_THEME, LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validTheme = validation(StoreSchema.shape["theme"], theme);
      const resolvedTheme = initTheme(validTheme);
      const isFocus = typeof focus === "boolean" && focus === true;
      const windowTheme = getTitleBarOverlay(resolvedTheme, isFocus);
      for (const window of BrowserWindow.getAllWindows()) {
        window.setBackgroundColor(windowTheme.backgroundColor);
        if (typeof window.setTitleBarOverlay === "function") {
          window.setTitleBarOverlay(windowTheme.overlayOptions);
        }
      }
      return resolvedTheme;
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.APP_PIN,
    withErrorHandling((e) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.APP_PIN, LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win || win.isDestroyed()) return false;
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
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.SHOW_NOTIFICATION,
    withErrorHandling((e, title: unknown, body: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.SHOW_NOTIFICATION, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validNotif = validation(NotificationSchema, { title, body });
      if (Notification.isSupported()) {
        const notif = new Notification(validNotif);
        notif.show();
      }
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.WRITE_IMAGE,
    withErrorHandling(async (e, payload) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.WRITE_IMAGE, LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ImagePayloadsSchema, payload);
      return await handleImageWriteMany(validatedData);
    }),
  );
  mainLogger.devLog("[registerIpc]: Electron IPC registered");
}

export { registerElectronIpc };
