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
  app.setAppUserModelId("MZO26.Editor");
}

export let win: BrowserWindow | null = null;
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
  const bounds = store.get("window-bounds");
  const windowConfig: BrowserWindowConstructorOptions = {
    show: false,
    width: Math.max(1100, bounds.width ?? 1100),
    height: Math.max(600, bounds.height ?? 600),
    minWidth: 1100,
    minHeight: 600,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 15, y: 10 },
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
  if (bounds.x !== undefined && bounds.y !== undefined) {
    windowConfig.x = bounds.x;
    windowConfig.y = bounds.y;
  } else {
    windowConfig.center = true;
  }
  win = new BrowserWindow(windowConfig);
  // attach listeners to win after it's assigned to BrowserWindow and not null
  navigationHandler(win);
  win.setMenuBarVisibility(false);
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  win?.on("close", (e) => {
    if (!isReadyToClose) {
      e.preventDefault();
      saveWindowBounds();
      win?.webContents.send("request-flush");
      return;
    }
  });
  ipcMain.once("app:start-ready", () => {
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

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
