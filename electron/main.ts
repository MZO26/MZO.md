import { app, BrowserWindow } from "electron";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipcHandlers";
import { registerCustomProtocol, setupLocalImageProtocol } from "./protocol";
import { store } from "./store";
import { getTitleBarOverlay, initTheme } from "./titlebar";
import { navigationHandler } from "./windowPolicies";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env["DIST"] = path.join(__dirname, "../dist");
process.env["VITE_PUBLIC"] = app.isPackaged
  ? process.env["DIST"]
  : path.join(process.env["DIST"], "../public");

registerCustomProtocol();

let win: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  console.log("__dirname:", __dirname);
  console.log("preload path:", preloadPath);
  const activeTheme = initTheme(store.get("theme"));

  win = new BrowserWindow({
    show: false,
    width: 1100,
    height: 600,
    titleBarStyle: "hidden",
    titleBarOverlay: getTitleBarOverlay(activeTheme),
    autoHideMenuBar: true,
    transparent: false,
    backgroundMaterial: "acrylic",
    backgroundColor: "#00000000",
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
      zoomFactor: 1.0,
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
  try {
    const db = await import("./database");
    console.log("Database loaded successfully:", db);
  } catch (error) {
    console.error("Failed to load database:", error);
  }
  setupLocalImageProtocol();
  registerIpcHandlers();
  createWindow();
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
