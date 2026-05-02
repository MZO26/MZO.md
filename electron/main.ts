import { setUpContextMenu } from "@electron/context-menu";
import { registerIpcHandlers } from "@electron/ipc/ipc-handlers";
import { wrapResult } from "@electron/ipc/ipc-validation";
import {
  navigationHandler,
  registerCustomProtocol,
  setupLocalImageProtocol,
} from "@electron/navigation-handler";
import { setPermissions } from "@electron/permissions";
import { store } from "@electron/store";
import {
  getTitleBarOverlay,
  initTheme,
  onOSThemeChange,
} from "@electron/titlebar";
import { app, BrowserWindow, ipcMain, Menu, nativeTheme } from "electron";
import console from "node:console";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
  const { default: contextMenu } = await import("electron-context-menu");
  contextMenu();
  createWindow();
  setupLocalImageProtocol();
  setPermissions();
  registerIpcHandlers();
  ipcMain.on(
    "show-note-menu",
    (event, id: string, pinned: boolean, bookmarked: boolean) => {
      return wrapResult(event, async () => {
        console.log("show menu for", id);
        if (win) {
          const contextMenu = setUpContextMenu(win, id, pinned, bookmarked);
          contextMenu.popup({ window: win });
        }
      });
    },
  );
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
