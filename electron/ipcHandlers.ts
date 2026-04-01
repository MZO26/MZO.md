import { dialog, ipcMain, nativeTheme } from "electron";
import fs from "node:fs";
import { THEME_MAP } from "../src/constants/themes";
import type { Theme } from "../src/shared/types";
import db from "./database";

function registerIpcHandlers() {
  ipcMain.handle("get:system-info", () => {
    return `Node.js Version: ${process.versions.node}, Electron: ${process.versions.electron}`;
  });

  ipcMain.handle("note:getAll", () => {
    try {
      const notes = db.getAll();
      return { success: true, notes };
    } catch (error) {
      console.error("Failed to get all notes:", error);
      return { success: false, message: "Failed to get all notes" };
    }
  });

  ipcMain.handle(
    "note:create",
    (_event, title: string, content: string, tags: string[]) => {
      try {
        const id = db.create(title, content, tags);
        return { success: true, id };
      } catch (error) {
        console.error("Failed to create note:", error);
        return { success: false, message: "Failed to create note" };
      }
    },
  );

  ipcMain.handle(
    "note:update",
    (_event, id: string, title: string, content: string, tags: string[]) => {
      try {
        const success = db.update(id, title, content, tags);
        if (!success) {
          return { success: false, message: "Note not found" };
        }
        return { success: success, id };
      } catch (error) {
        console.error("Failed to update note:", error);
        return { success: false, message: "Failed to update note" };
      }
    },
  );

  ipcMain.handle("note:delete", (_event, id: string) => {
    try {
      const success = db.delete(id);
      if (!success) {
        return { success: false, message: "Note not found" };
      }
      return { success: success, id };
    } catch (error) {
      console.error("Failed to delete note", error);
      return { success: false, message: "Failed to delete note" };
    }
  });

  ipcMain.handle("note:getById", (_event, id: string) => {
    try {
      const note = db.getById(id);
      if (!note) {
        return { success: false, message: "Note not found" };
      }
      return { success: true, note };
    } catch (error) {
      console.error("Failed to get note by ID", error);
      return { success: false, message: "Failed to get note by ID" };
    }
  });

  ipcMain.handle("set:theme", (_, theme: Theme) => {
    if (theme in THEME_MAP) {
      const validTheme = theme as Theme;
      nativeTheme.themeSource = THEME_MAP[validTheme];
      return { success: true };
    }
    return { success: false, message: "Invalid theme" };
  });

  ipcMain.handle("file-open", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Markdown", extensions: ["md", "txt"] }],
    });

    if (!canceled && filePaths.length > 0) {
      const inhalt = fs.readFileSync(filePaths[0]!, "utf-8");
      return { inhalt, pfad: filePaths[0]! };
    }
    return null;
  });

  ipcMain.handle("file-save", async (_event, { pfad, inhalt, win }) => {
    if (pfad) {
      fs.writeFileSync(pfad, inhalt, "utf-8");
      return true;
    } else {
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!canceled && filePath) {
        fs.writeFileSync(filePath, inhalt, "utf-8");
        return filePath;
      }
    }
    return false;
  });
}

export { registerIpcHandlers };
