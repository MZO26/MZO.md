import { setUpNoteMenu } from "@electron/context-menu";
import db from "@electron/db/database";
import { checkRateLimit, safeResponse } from "@electron/ipc/ipc-validation";
import { LIMITS } from "@shared/constants";
import { measure, validation } from "@shared/ipc-helpers";
import {
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  IdSchema,
  IdsSchema,
  MergeTransactionSchema,
  SearchSchema,
  TagSchema,
  UpdateNotePayloadSchema,
} from "@shared/schemas/note-schema";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";

function registerNoteIpc(win: BrowserWindow) {
  ipcMain.handle("note:getAll", (e) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getAll", LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      const result = db.getAll();
      return result;
    });
  });

  ipcMain.handle("note:create", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:create", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(CreateNotePayloadSchema, payload);
      const result = db.create(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:create-many", (e, payloads: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:create-many", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(CreateNotesPayloadsSchema, payloads);
      const result = db.createMany(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:merge", (e, idA: unknown, idB: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:merge", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedIds = validation(MergeTransactionSchema, { idA, idB });
      return db.transactions.safeMerge(validatedIds);
    });
  });

  ipcMain.handle("note:update", (e, payload: unknown, flush: unknown) => {
    return safeResponse(e, async () => {
      if (!flush) {
        if (!checkRateLimit("note:update", LIMITS.WRITE_LIGHT))
          throw new Error("RATE_LIMIT");
      } else {
        if (!checkRateLimit("note:flush-override", LIMITS.WRITE_FLUSH)) {
          throw new Error("RATE_LIMIT");
        }
      }
      const validatedData = validation(UpdateNotePayloadSchema, payload);
      const result = db.update(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:delete", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:delete", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdSchema, id);
      const result = db.delete(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:getById", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getById", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdSchema, id);
      const result = db.getById(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:getManyById", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getManyById", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdsSchema, id);
      const result = db.getManyById(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:getByTag", (e, tag: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getByTag", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(TagSchema, tag);
      const result = db.searchByTag(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:search", (e, searchTerm: unknown, limit: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:search", LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(SearchSchema, { searchTerm, limit });
      const { searchTerm: validSearchTerm, limit: validSearchLimit } =
        validatedData;
      const result = db.search.searchNotes(validSearchTerm, validSearchLimit);
      return result;
    });
  });

  ipcMain.handle("note:pin", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:pin", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdSchema, id);
      const result = db.togglePin(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:bookmark", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:bookmark", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdSchema, id);
      const result = db.toggleBookmark(validatedData);
      return result;
    });
  });

  ipcMain.handle("views:get", (e, view: unknown) => {
    let result;
    return safeResponse(e, async () => {
      if (!checkRateLimit(`get:view:${view}`, LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      switch (view) {
        case "bookmarked":
          result = db.getBookMarkedNotes();
          break;
        case "pinned":
          result = db.getPinnedNotes();
          break;
        case "todos":
          result = db.getNotesWithActionItems();
          break;
        case "all":
          return db.getAll();
        case "untagged":
          return db.getUntaggedNotes();
        default:
          throw new Error("INVALID_VIEW");
      }
      return result;
    });
  });

  ipcMain.handle("db-maintenance", (e, action: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("db-maintenance", LIMITS.WRITE_HEAVY))
        throw new Error("RATE_LIMIT");
      switch (action) {
        case "optimize-db":
          return measure(() => {
            db.optimizeDb();
          });
        case "vacuum-db":
          return measure(() => {
            db.vacuumDb();
          });
        case "backup-db":
          const timestamp = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/[:T]/g, "-");
          const defaultPath = path.join(
            app.getPath("documents"),
            `db-backup-${timestamp}.sqlite`,
          );
          const { canceled, filePath } = await dialog.showSaveDialog(win, {
            title: "Backup database",
            defaultPath,
            buttonLabel: "Save backup",
            filters: [
              { name: "SQLite Database", extensions: ["sqlite", "db"] },
            ],
            properties: ["showOverwriteConfirmation"],
          });
          if (canceled || !filePath) {
            throw new Error("CANCELLED_OPERATION");
          }
          const result = await db.backupDb(filePath);
          return result.totalPages;
        default: {
          throw new Error("INVALID_ACTION");
        }
      }
    });
  });

  ipcMain.on(
    "show-note-menu",
    (e, id: string, pinned: boolean, bookmarked: boolean) => {
      return safeResponse(e, async () => {
        if (!checkRateLimit("zoom:get", LIMITS.READ_LIGHT))
          throw new Error("RATE_LIMIT");
        if (win) {
          const contextMenu = setUpNoteMenu(win, id, pinned, bookmarked);
          contextMenu.popup({ window: win });
        }
      });
    },
  );
}

export { registerNoteIpc };
