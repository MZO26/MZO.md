import { app, BrowserWindow, Menu, nativeTheme, shell } from "electron";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipcHandlers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env["DIST"] = path.join(__dirname, "../dist");
process.env["VITE_PUBLIC"] = app.isPackaged
  ? process.env["DIST"]
  : path.join(process.env["DIST"], "../public");

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
};

let win: BrowserWindow | null = null;
nativeTheme.themeSource = "system";

function getTitleBarOverlay(): TitleBarOverlayOptions {
  let isDark = nativeTheme.shouldUseDarkColors;
  //boolean to check if the system theme is dark or light, used to set the title bar overlay colors accordingly
  return isDark === true
    ? { color: "#00000000", symbolColor: "#a1a1aa", height: 30 }
    : {
        color: "#00000000",
        symbolColor: "#71717a",
        height: 30,
      };
}

function createWindow() {
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  console.log("__dirname:", __dirname);
  console.log("preload path:", preloadPath);

  win = new BrowserWindow({
    minHeight: 600,
    minWidth: 1000,
    width: 1000,
    height: 600,
    titleBarStyle: "hidden",
    titleBarOverlay: getTitleBarOverlay(),
    transparent: false,
    backgroundMaterial: "acrylic",
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.openDevTools();
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try {
    const db = await import("./database");
    console.log("Database loaded successfully:", db);
  } catch (error) {
    console.error("Failed to load database:", error);
  }
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
