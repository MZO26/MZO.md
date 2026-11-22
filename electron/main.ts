import { setUpEditorMenu } from "@electron/context-menu";
import db from "@electron/db/database";
import { initBackupScheduler } from "@electron/fs/fs-backup";
import { setupGlobalErrorHandling } from "@electron/handler/global-handler";
import { handleUrl, LinkAppState, PROTOCOL } from "@electron/handler/link-handler";
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
  Menu,
  nativeTheme,
  session,
  type BrowserWindowConstructorOptions,
} from "electron";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const FLUSH_TIMEOUT_MS = 5000;

interface FlushState {
  timeout: NodeJS.Timeout | null;
  isReadyToClose: boolean;
  isFlushing: boolean;
}

export const FlushAppState: FlushState = {
  timeout: null,
  isReadyToClose: false,
  isFlushing: false,
};

export let win: BrowserWindow | null = null;

function resetFlushState() {
  clearFlushTimeout();
  FlushAppState.isFlushing = false;
  FlushAppState.isReadyToClose = false;
}

export function clearFlushTimeout() {
  if (FlushAppState.timeout) {
    clearTimeout(FlushAppState.timeout);
    FlushAppState.timeout = null;
  }
}

export function getMainWindow(): BrowserWindow | null {
  return win && !win.isDestroyed() ? win : null;
}

if (process.defaultApp && process.argv.length >= 2) {
  const uri = process.argv[1];
  if (uri) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(uri)]);
  }
} else app.setAsDefaultProtocolClient(PROTOCOL);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    const url = argv.find((a) => a.startsWith(`${PROTOCOL}`));
    if (win?.isMinimized()) win.restore();
    win?.focus();
    if (url && win) handleUrl(win, url);
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

const isMac = process.platform === "darwin";

async function createWindow() {
  resetFlushState();
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
    ...(isMac ? { trafficLightPosition: { x: 15, y: 9 } } : {}),
    ...(!isMac ? { titleBarOverlay: windowTheme.overlayOptions } : {}),
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
  win.on("close", (e) => {
    if (!win || win.isDestroyed()) return;
    if (!FlushAppState.isReadyToClose) {
      e.preventDefault();
      if (!FlushAppState.isFlushing) {
        FlushAppState.isFlushing = true;
        try {
          saveWindowBounds();
        } catch {}
        if (win.isDestroyed() || win.webContents.isDestroyed()) {
          FlushAppState.isFlushing = false;
          FlushAppState.isReadyToClose = true;
          return;
        }
        clearFlushTimeout();
        win.webContents.send(IPC_CHANNELS.REQUEST_FLUSH);
        FlushAppState.timeout = setTimeout(() => {
          FlushAppState.timeout = null;
          mainLogger.devLog("Flush timeout - forced close");
          FlushAppState.isReadyToClose = true;
          FlushAppState.isFlushing = false;
          if (win && !win.isDestroyed()) win.close();
        }, FLUSH_TIMEOUT_MS);
        FlushAppState.timeout.unref();
      }
    }
  });
  win.webContents.on("did-start-loading", () => {
    LinkAppState.rendererReady = false;
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.setZoomFactor(1.1);
  });
  win.on("closed", () => {
    resetFlushState();
    LinkAppState.rendererReady = false;
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

app
  .whenReady()
  .then(async () => {
    initSettings();
    Menu.setApplicationMenu(null);
    session.defaultSession.setSpellCheckerLanguages(["en-US", "de-DE"]);
    setPermissions();
    await setupLocalImageProtocol();
    registerIpc();
    const win = await createWindow();
    const url = process.argv.find((a) => a.startsWith(`${PROTOCOL}://`));
    handleUrl(win, LinkAppState.pendingUrl ?? url ?? "");
    const backupDir = path.join(app.getPath("userData"), "Backups");
    initBackupScheduler(backupDir);
    nativeTheme.on("updated", () => {
      const theme = settingsService.get("theme");
      onOSThemeChange(theme);
    });
  })
  .catch((error: unknown) => mainLogger.appError("Error during app start", error));

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("open-url", (e, url) => {
  e.preventDefault();
  if (app.isReady() && win) handleUrl(win, url);
  else LinkAppState.pendingUrl = url;
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
