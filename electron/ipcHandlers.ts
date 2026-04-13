import { dialog, ipcMain, nativeTheme } from "electron";
import fs from "node:fs";
import { THEME_MAP } from "../src/constants/themes";
import type { Theme } from "../src/shared/types";
import {
  validateCreate,
  validateId,
  validateSearch,
  validateUpdate,
} from "../src/shared/validation";
import db from "./database";
import { store } from "./store";

function registerIpcHandlers() {
  ipcMain.handle("get:system-info", () => {
    return `Node.js Version: ${process.versions.node}, Electron: ${process.versions.electron}`;
  });

  ipcMain.handle("note:getAll", () => {
    try {
      const data = db.getAll();
      return { success: true, data };
    } catch (error) {
      console.error("Failed to get all notes:", error);
      return { success: false, message: "Failed to get all notes" };
    }
  });

  ipcMain.handle("note:create", (_event, payload: unknown) => {
    const result = validateCreate(payload);
    if (!result.success) {
      return result;
    }
    try {
      const data = db.create(result.data);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to create note:", error);
      return { success: false, message: "Failed to create note" };
    }
  });

  ipcMain.handle("note:update", (_event, payload: unknown) => {
    const result = validateUpdate(payload);
    if (!result.success) {
      return result;
    }
    try {
      const data = db.update(result.data);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to update note:", error);
      return { success: false, message: "Note not found" };
    }
  });

  ipcMain.handle("note:delete", (_event, id: unknown) => {
    const result = validateId(id);
    if (!result.success) {
      return result;
    }
    try {
      const success = db.delete(result.data);
      if (!success) {
        return { success: false, message: "Note not found" };
      }
      return { success: success };
    } catch (error) {
      console.error("Failed to delete note", error);
      return { success: false, message: "Failed to delete note" };
    }
  });

  ipcMain.handle("note:getById", (_event, id: unknown) => {
    const result = validateId(id);
    if (!result.success) {
      return result;
    }
    try {
      const data = db.getById(result.data);
      if (!data) {
        return { success: false, message: "Note not found" };
      }
      return { success: true, data };
    } catch (error) {
      console.error("Failed to get note by ID", error);
      return { success: false, message: "Failed to get note by ID" };
    }
  });

  ipcMain.handle(
    "note:search",
    async (_event, searchTerm: string, limit: number) => {
      const result = validateSearch(searchTerm, limit);

      if (!result.success) {
        return result;
      }
      const { searchTerm: validSearchTerm, limit: validLimit } = result.data;
      try {
        const data = db.search.searchNotes(validSearchTerm, validLimit);
        return { success: true, data };
      } catch (error) {
        console.error("Failed to search note", error);
        return { success: false, data: [] };
      }
    },
  );

  ipcMain.handle("set:theme", (_event, theme: Theme) => {
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

  ipcMain.handle("electron-store:get", async (_event, key: string) => {
    try {
      const value = store.get(key);
      return { success: true, data: value };
    } catch (error) {
      console.error(`[IPC] Error while loading key "${key}":`, error);
      return { success: false, message: "Error while loading" };
    }
  });

  ipcMain.handle(
    "electron-store:set",
    async (_event, key: string, val: any) => {
      try {
        store.set(key, val);
        return { success: true };
      } catch (error) {
        console.error(`[IPC] Error saving key "${key}:`, error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  );
}

export { registerIpcHandlers };
