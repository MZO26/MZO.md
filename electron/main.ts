import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeTheme,
  shell,
} from "electron";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import db from "./database";
import { registerFileSystemHandlers } from "./fileSystem";

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
  return isDark
    ? { color: "#18181b", symbolColor: "#d4d4d8", height: 30 }
    : {
        color: "#f3f3f3",
        symbolColor: "#202020",
        height: 30,
      };
}

function createWindow() {
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  console.log("__dirname:", __dirname);
  console.log("preload path:", preloadPath);

  win = new BrowserWindow({
    minHeight: 600,
    minWidth: 725,
    width: 800,
    height: 600,
    titleBarStyle: "hidden",
    titleBarOverlay: getTitleBarOverlay(),

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
  ipcMain.handle("get-system-info", () => {
    return `Node.js Version: ${process.versions.node}, Electron: ${process.versions.electron}`;
  });

  ipcMain.handle("get-theme", () => {
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  });

  ipcMain.handle("set-theme", async (_event, theme: Theme) => {
    nativeTheme.themeSource = theme;
    if (win) {
      win.setTitleBarOverlay(getTitleBarOverlay());
    }
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  });

  nativeTheme.on("updated", () => {
    if (win) {
      win.setTitleBarOverlay(getTitleBarOverlay());
    }
    win?.webContents.send(
      "theme-changed",
      nativeTheme.shouldUseDarkColors ? "dark" : "light",
    );
  });

  ipcMain.handle("notes:getAll", () => {
    const notes = db.getAll();
    return notes;
  });

  ipcMain.handle("notes:create", (_event, title: string, content: string) => {
    const id = db.create(title, content);
    return id;
  });

  ipcMain.handle(
    "notes:update",
    (_event, id: string, title: string, content: string) => {
      const success = db.update(id, title, content);
      return success;
    },
  );

  ipcMain.handle("notes:delete", (_event, id: string) => {
    const success = db.delete(id);
    return success;
  });

  ipcMain.handle("notes:getById", (_event, id: string) => {
    const note = db.getById(id);
    return note;
  });

  registerFileSystemHandlers(win!);
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
