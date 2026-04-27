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
import { getTitleBarOverlay, initTheme } from "./titlebar";

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
  nativeTheme.on("updated", () => {
    const savedTheme = store.get("theme");

    // We ONLY want to update the app if the user is relying on the OS "system" setting
    if (savedTheme === "system") {
      // 1. Recalculate your custom Electron title bar colors
      const newActiveTheme = initTheme("system");
      const newWindowTheme = getTitleBarOverlay(newActiveTheme);

      if (win && !win.isDestroyed()) {
        // 2. Update the native Electron window background and title bar
        win.setBackgroundColor(newWindowTheme.backgroundColor);
        win.setTitleBarOverlay(newWindowTheme.overlayOptions);

        // 3. Resolve "system" into an actual color scheme for your frontend CSS
        // Since it's set to "system", the actual applied theme will be "dark" or "light"
        const resolvedTheme = nativeTheme.shouldUseDarkColors
          ? "dark"
          : "light";
        console.log("SENDING THEME TO FRONTEND:", resolvedTheme); // Add this!
        // Send the strictly typed string to the frontend
        win.webContents.send("theme-changed", resolvedTheme);
      }
    }
  });
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
