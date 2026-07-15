import { setUpEditorMenu } from "@electron/context-menu";
import db from "@electron/db/database";
import { setupGlobalErrorHandling } from "@electron/handler/global-error-handler";
import {
  navigationHandler,
  registerCustomProtocol,
  setupLocalImageProtocol,
} from "@electron/handler/navigation-handler";
import { setPermissions } from "@electron/handler/permission-handler";
import { settingsService } from "@electron/handler/settings-handler";
import { registerIpc } from "@electron/ipc/ipc-validation";
import {
  getTitleBarOverlay,
  initTheme,
  onOSThemeChange,
} from "@electron/titlebar";
import { saveWindowBounds } from "@electron/win";
import { DEFAULT_SETTINGS } from "@shared/constants";
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

export let win: BrowserWindow | null = null;

let isReadyToClose = false;

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
  ignore: ["DownloadItem", "net::ERR_ABORTED", "net::ERR_CONNECTION_REFUSED"],
});

// window logic

async function initSettings(): Promise<AppSettings> {
  try {
    db.open();
    await settingsService.initialize();
    return settingsService.getSettings();
  } catch (error) {
    console.error(
      "[initSettings]: Couldn't load settings from DB. Using defaults.",
      error,
    );
    return DEFAULT_SETTINGS;
  }
}

async function createWindow() {
  const settings = await initSettings();
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  const activeTheme = initTheme(settings.theme);
  const windowTheme = getTitleBarOverlay(activeTheme);
  const bounds = settings["window_bounds"];
  const windowConfig: BrowserWindowConstructorOptions = {
    show: false,
    width: Math.max(1100, bounds?.width ?? 1100),
    height: Math.max(800, bounds?.height ?? 800),
    minWidth: 800,
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
  if (bounds?.x !== undefined && bounds?.y !== undefined) {
    windowConfig.x = bounds.x;
    windowConfig.y = bounds.y;
  } else {
    windowConfig.center = true;
  }
  win = new BrowserWindow(windowConfig);
  navigationHandler(win);
  win.setMenuBarVisibility(false);
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  win.on("close", (e) => {
    if (!isReadyToClose) {
      e.preventDefault();
      saveWindowBounds();
      win?.webContents.send("request-flush");
      return;
    }
  });
  win.once("ready-to-show", () => {
    win?.show();
  });
}

// app start

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  session.defaultSession.setSpellCheckerLanguages(["en-US", "de-DE"]);
  ipcMain.on("flush-confirmed", () => {
    isReadyToClose = true;
    win?.close();
  });
  await createWindow();
  setupLocalImageProtocol();
  setPermissions();
  if (win) {
    registerIpc(win);
    setUpEditorMenu(win);
  }
});

nativeTheme.on("updated", () => {
  const settings = settingsService.getSettings();
  if (win && !win.isDestroyed()) onOSThemeChange(win, settings.theme);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("will-quit", () => {
  db.pragma("optimize");
  db.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
