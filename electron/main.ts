import { app, BrowserWindow, Menu, nativeTheme } from "electron";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc/ipcHandlers";
import {
  navigationHandler,
  registerCustomProtocol,
  setupLocalImageProtocol,
} from "./navigationHandler";
import { setPermissions } from "./permissions";
import { store } from "./store";
import { getTitleBarOverlay, initTheme, onOSThemeChange } from "./titlebar";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env["DIST"] = path.join(__dirname, "../dist");
process.env["VITE_PUBLIC"] = app.isPackaged
  ? process.env["DIST"]
  : path.join(process.env["DIST"], "../public");

registerCustomProtocol();

let win: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  const activeTheme = initTheme(store.get("theme"));
  const windowTheme = getTitleBarOverlay(activeTheme);

  win = new BrowserWindow({
    show: false,
    width: 1100,
    height: 600,
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
  });
  navigationHandler(win);
  win.webContents.openDevTools();
  win.setMenuBarVisibility(false);
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  win.once("ready-to-show", () => {
    win?.show();
  });
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  createWindow();
  setupLocalImageProtocol();
  setPermissions();
  registerIpcHandlers();
  nativeTheme.on("updated", () => {
    if (win) onOSThemeChange(win, store.get("theme"));
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
