import { app, BrowserWindow, ipcMain } from "electron";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  StoreSchema,
  type AppSettings,
  type Theme,
} from "../../shared/schemas/storeSchema";
import {
  validateCreate,
  validateId,
  validateImage,
  validateSearch,
  validateStore,
  validateTheme,
  validateUpdate,
} from "../../shared/validation";
import db from "../db/database";
import { store } from "../store";
import { getTitleBarOverlay, initTheme } from "../titlebar";
import { checkRateLimit, tryExec } from "./ipcValidation";

const LIMITS = {
  WRITE_HEAVY: 2000, // saveImage
  WRITE_STANDARD: 1000, // create, delete, store:set
  WRITE_LIGHT: 300, // update, setTheme
  READ_HEAVY: 500, // search, getAll
  READ_LIGHT: 100, // getById, store:get
};

function registerIpcHandlers() {
  ipcMain.handle("note:getAll", (event) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("note:getAll", LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      const result = db.getAll();
      return result;
    });
  });

  ipcMain.handle("note:create", (event, payload: unknown) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("note:create", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validateCreate(payload);
      const result = db.create(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:update", (event, payload: unknown, flush: unknown) => {
    return tryExec(event, async () => {
      if (!flush) {
        if (!checkRateLimit("note:update-flush", 100)) {
          throw new Error("RATE_LIMIT");
        }
        if (!checkRateLimit("note:update", LIMITS.WRITE_LIGHT))
          throw new Error("RATE_LIMIT");
      }
      const validatedData = validateUpdate(payload);
      const result = db.update(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:delete", (event, id: unknown) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("note:search", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validateId(id);
      const result = db.delete(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:getById", (event, id: unknown) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("note:getById", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateId(id);
      const result = db.getById(validatedData);
      return result;
    });
  });

  ipcMain.handle(
    "note:search",
    (event, searchTerm: unknown, limit: unknown) => {
      return tryExec(event, async () => {
        if (!checkRateLimit("note:search", LIMITS.READ_HEAVY))
          throw new Error("RATE_LIMIT");
        const validatedData = validateSearch(searchTerm, limit);
        const { searchTerm: validSearchTerm, limit: validSearchLimit } =
          validatedData;
        const result = db.search.searchNotes(validSearchTerm, validSearchLimit);
        return result;
      });
    },
  );

  ipcMain.handle("note:pin", (event, id: string) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("note:pin", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateId(id);
      const result = db.togglePin(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:bookmark", (event, id: string) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("note:bookmark", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateId(id);
      const result = db.toggleBookmark(validatedData);
      return result;
    });
  });

  ipcMain.handle("views:get", (event, view) => {
    let result;
    return tryExec(event, async () => {
      if (!checkRateLimit(`get:view:${view}`, LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      switch (view) {
        case "bookmarked":
          result = db.views.getBookmarkedNotes();
          break;
        case "pinned":
          result = db.views.getPinnedNotes();
          break;
        case "todos":
          result = db.views.getNotesWithActionItems();
          break;
        case "all":
          return db.getAll();
        default:
          throw new Error("INVALID_VIEW");
      }
      return result;
    });
  });

  ipcMain.handle("set:theme", (event, theme: Theme, focus?: boolean) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("set:theme", LIMITS.WRITE_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateTheme(theme);
      const activeTheme = initTheme(validatedData);
      const windowTheme = focus
        ? getTitleBarOverlay(activeTheme, true)
        : getTitleBarOverlay(activeTheme, false);
      BrowserWindow.getAllWindows().forEach((win) => {
        win.setTitleBarOverlay?.(windowTheme.overlayOptions);
      });
      return theme;
    });
  });

  ipcMain.handle("saveImage", (event, payload: unknown) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("saveImage", LIMITS.WRITE_HEAVY))
        throw new Error("RATE_LIMIT");
      const validatedData = validateImage(payload);
      const userDataPath = app.getPath("userData");
      const imagesFolder = path.join(userDataPath, "editor-images");
      // Create the folder if it doesn't exist yet
      if (!fs.existsSync(imagesFolder)) {
        fs.mkdirSync(imagesFolder, { recursive: true }); // to guarantee folder exists
      }
      const imageBuffer = Buffer.from(validatedData.imageData);
      const hash = createHash("sha256").update(imageBuffer).digest("hex");
      // converts frontend ArrayBuffer to NodeJS Buffer Format so file system can understand it. Hashes image name but finds duplicates compared to uuid which always creates new id's
      const fileName = `${hash}.${validatedData.extension}`;
      const filePath = path.join(imagesFolder, fileName);
      if (fs.existsSync(filePath)) {
        console.log("Image already existing. Skipping saving process");
        return { imageSrc: `appimg:///${fileName}` };
      }
      // 4. Save the file to the hard drive
      fs.writeFileSync(filePath, imageBuffer);
      // 5. Return the local file path to Tiptap
      return {
        imageSrc: `appimg:///${fileName}`,
      };
    });
  });

  ipcMain.handle("electron-store:get", (event, key: string) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("electron-store:get", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const keyValidation = StoreSchema.keyof().safeParse(key);
      if (!keyValidation.success) {
        console.error(`Invalid store key requested: ${key}`);
        return null;
      }
      const safeKey = keyValidation.data;
      const value = store.get(safeKey);
      const keySchema = StoreSchema.shape[safeKey];
      const result = keySchema.safeParse(value);
      return result.data;
    });
  });

  ipcMain.handle("electron-store:set", async (event, settings: AppSettings) => {
    return tryExec(event, async () => {
      if (!checkRateLimit("electron-store:set", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validValue = validateStore(settings);
      store.set(validValue);
    });
  });
}

export { registerIpcHandlers };
