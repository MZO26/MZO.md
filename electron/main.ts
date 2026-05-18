import { setUpEditorMenu } from "@electron/context-menu";
import { setupGlobalErrorHandling } from "@electron/handler/error-handler";
import {
  navigationHandler,
  registerCustomProtocol,
  setupLocalImageProtocol,
} from "@electron/handler/navigation-handler";
import { setPermissions } from "@electron/handler/permission-handler";
import { registerIpc } from "@electron/ipc/ipc-validation";
import { store } from "@electron/store";
import {
  getTitleBarOverlay,
  initTheme,
  onOSThemeChange,
} from "@electron/titlebar";
import { saveWindowBounds } from "@electron/win";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeTheme,
  Tray,
  type BrowserWindowConstructorOptions,
} from "electron";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env["DIST"] = path.join(__dirname, "../dist");
process.env["VITE_PUBLIC"] = app.isPackaged
  ? process.env["DIST"]
  : path.join(process.env["DIST"], "../public");

if (process.platform === "win32") {
  app.setAppUserModelId("MZO26.MDEditor");
}

export let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let isForceQuitting = false;
let isReadyToClose = false;

registerCustomProtocol();
setupGlobalErrorHandling({
  ignore: ["DownloadItem", "net::ERR_ABORTED", "net::ERR_CONNECTION_REFUSED"],
});

// window logic

function createWindow() {
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  const activeTheme = initTheme(store.get("theme"));
  const windowTheme = getTitleBarOverlay(activeTheme);
  const openMode = store.get("open-window-mode");
  const bounds = store.get("window-bounds");
  const windowConfig: BrowserWindowConstructorOptions = {
    show: false,
    width: Math.max(1100, bounds.width ?? 1100),
    height: Math.max(600, bounds.height ?? 600),
    minWidth: 1100,
    minHeight: 600,
    titleBarStyle: "hidden",
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
      spellcheck: false,
    },
  };

  if (openMode === "centered") {
    windowConfig.center = true;
  } else if (openMode === "restore") {
    if (bounds.x !== undefined && bounds.y !== undefined) {
      windowConfig.x = bounds.x;
      windowConfig.y = bounds.y;
    } else {
      windowConfig.center = true;
    }
  }
  win = new BrowserWindow(windowConfig);
  // attach listeners to win after it's assigned to BrowserWindow and not null
  navigationHandler(win);
  win.webContents.openDevTools();
  win.setMenuBarVisibility(false);
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  win?.on("close", (e) => {
    const closeMode = store.get("close-window-mode");
    if (!isForceQuitting) {
      if (closeMode === "tray") {
        e.preventDefault();
        win?.hide();
        return;
      } else if (closeMode === "minimize") {
        e.preventDefault();
        win?.minimize();
        return;
      }
    }
    if (!isReadyToClose) {
      e.preventDefault();
      saveWindowBounds();
      win?.webContents.send("request-flush");
      return;
    }
  });
  win.on("minimize", () => {
    const minimizeMode = store.get("minimize-mode");
    if (minimizeMode === "tray") {
      win?.setSkipTaskbar(true);
      win?.hide();
    }
  });
  win.once("ready-to-show", () => {
    if (openMode === "maximized") {
      win?.maximize();
    }
    win?.show();
  });
}

// app start and tray

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  ipcMain.on("flush-confirmed", () => {
    isReadyToClose = true;
    win?.close();
  });
  createWindow();
  setupLocalImageProtocol();
  setPermissions();
  registerIpc(win as BrowserWindow);
  setUpEditorMenu();
  const trayIcon = await app.getFileIcon(process.execPath);
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "open", click: () => win?.show() },
    {
      label: "quit",
      click: () => {
        isForceQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (win) {
      if (win.isVisible() && !win.isMinimized()) {
        win.focus();
      } else {
        win.setSkipTaskbar(false);
        win.show();
        if (win.isMinimized()) {
          win.restore();
        }
        win.focus();
      }
    }
  });
});

// global app events / lifecycle events

nativeTheme.on("updated", () => {
  if (win) onOSThemeChange(win, store.get("theme"));
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  isForceQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
