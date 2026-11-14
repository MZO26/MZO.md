import { setUpEditorMenu } from "@electron/context-menu";
import db from "@electron/db/database";
import { initBackupScheduler } from "@electron/fs/fs-backup";
import { setupGlobalErrorHandling } from "@electron/handler/global-handler";
import {
  navigationHandler,
  registerCustomProtocol,
  setupLocalImageProtocol,
} from "@electron/handler/navigation-handler";
import { mainLogger, setPermissions } from "@electron/handler/permission-handler";
import { settingsService } from "@electron/handler/settings-handler";
import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import { registerIpc } from "@electron/ipc/ipc-validation";
import { getTitleBarOverlay, initTheme, onOSThemeChange } from "@electron/titlebar";
import { isWindowVisible, saveWindowBounds } from "@electron/win";
import { type AppSettings } from "@shared/schemas/store-schema";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeTheme,
  session,
  type BrowserWindowConstructorOptions,
} from "electron";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const FLUSH_TIMEOUT_MS = 5000;

let win: BrowserWindow | null = null;
let isReadyToClose = false;
let isFlushing = false;
let flushTimeout: NodeJS.Timeout | null = null;

export function getMainWindow(): BrowserWindow | null {
  return win && !win.isDestroyed() ? win : null;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

registerCustomProtocol();
setupGlobalErrorHandling({
  ignore: [
    "DownloadItem",
    "net::ERR_ABORTED",
    "net::ERR_CONNECTION_REFUSED",
    "Object has been destroyed",
  ],
});

function initSettings(): Readonly<AppSettings> {
  try {
    db.open();
    settingsService.initialize();
  } catch (error) {
    mainLogger.appError("[initSettings]: Couldn't load settings from DB. Using defaults.", error);
  }
  return settingsService.getSettings();
}

async function createWindow() {
  isReadyToClose = false;
  isFlushing = false;
  const settings = settingsService.getSettings();
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  const activeTheme = initTheme(settings.theme);
  const windowTheme = getTitleBarOverlay(activeTheme);
  const bounds = settings["window_bounds"];
  const windowConfig: BrowserWindowConstructorOptions = {
    show: false,
    width: Math.max(700, bounds?.width ?? 1100),
    height: Math.max(500, bounds?.height ?? 800),
    minWidth: 700,
    minHeight: 500,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 15, y: 9 },
    titleBarOverlay: windowTheme.overlayOptions,
    autoHideMenuBar: true,
    transparent: false,
    backgroundColor: windowTheme.backgroundColor,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      navigateOnDragDrop: false,
      allowRunningInsecureContent: false,
      safeDialogs: true,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      spellcheck: true,
    },
  };
  if (bounds?.x !== undefined && bounds?.y !== undefined && isWindowVisible(bounds.x, bounds.y)) {
    windowConfig.x = bounds.x;
    windowConfig.y = bounds.y;
  } else {
    windowConfig.center = true;
  }
  win = new BrowserWindow(windowConfig);
  navigationHandler(win);
  win.setMenuBarVisibility(false);
  setUpEditorMenu(win);
  win.once("ready-to-show", () => {
    win?.show();
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.setZoomFactor(1.1);
  });
  win.on("close", (e) => {
    if (win?.isDestroyed()) return;
    if (!isReadyToClose) {
      e.preventDefault();
      if (!isFlushing) {
        isFlushing = true;
        try {
          saveWindowBounds();
        } catch {}
        if (!win?.isDestroyed()) win?.webContents.send(IPC_CHANNELS.REQUEST_FLUSH);
        flushTimeout = setTimeout(() => {
          mainLogger.devLog("Flush timeout - forced close");
          isReadyToClose = true;
          isFlushing = false;
          if (!win?.isDestroyed()) win?.close();
        }, FLUSH_TIMEOUT_MS);
      }
      return;
    }
  });
  win.on("closed", () => {
    win = null;
  });
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    await win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    win.webContents.openDevTools();
  } else {
    await win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  return win;
}

// app start

app
  .whenReady()
  .then(async () => {
    initSettings();
    Menu.setApplicationMenu(null);
    session.defaultSession.setSpellCheckerLanguages(["en-US", "de-DE"]);
    setPermissions();
    await setupLocalImageProtocol();
    ipcMain.on(IPC_CHANNELS.CONFIRM_FLUSH, (event) => {
      if (flushTimeout) clearTimeout(flushTimeout);
      flushTimeout = null;
      isReadyToClose = true;
      isFlushing = false;
      const currentWin = BrowserWindow.fromWebContents(event.sender);
      currentWin?.close();
    });
    registerIpc();
    await createWindow();
    const backupDir = path.join(app.getPath("userData"), "Backups");
    initBackupScheduler(backupDir);
    nativeTheme.on("updated", () => {
      const currentSettings = settingsService.getSettings();
      if (win && !win.isDestroyed()) {
        onOSThemeChange(win, currentSettings.theme);
      }
    });
  })
  .catch((error) => mainLogger.appError("Error during app start", error));

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("will-quit", () => {
  if (gotLock) {
    try {
      db.execPragma("optimize");
      db.close();
    } catch (error) {
      mainLogger.appError("Error closing DB", error);
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
