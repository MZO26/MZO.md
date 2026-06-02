import db from "@electron/db/database";
import { handleDBBackupDialog } from "@electron/fs/fs-dialog";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  checkRateLimit,
  measure,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { LIMITS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { runWithNoteLock } from "@shared/limiter";
import {
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  IdSchema,
  IdsSchema,
  UpdateNotePayloadSchema,
} from "@shared/schemas/note-schema";
import { BrowserWindow, ipcMain } from "electron";

function registerNoteIpc(win: BrowserWindow) {
  ipcMain.handle("note:getAll", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("note:getAll", LIMITS.READ_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      return db.getAll();
    });
  });

  ipcMain.handle("note:create", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:create", LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(CreateNotePayloadSchema, payload);
      return db.create(validatedData);
    });
  });

  ipcMain.handle("note:create-many", (e, payloads: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:create-many", LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(CreateNotesPayloadsSchema, payloads);
      return db.createMany(validatedData);
    });
  });

  ipcMain.handle("note:update", (e, payload: unknown, flush: unknown) => {
    return result(e, async () => {
      if (!flush) {
        if (!checkRateLimit("note:update", LIMITS.WRITE_LIGHT))
          throw new AppBackendError(AppErrorCode.RateLimitError);
      } else {
        if (!checkRateLimit("note:flush-override", LIMITS.WRITE_FLUSH)) {
          throw new AppBackendError(AppErrorCode.RateLimitError);
        }
      }
      const validatedData = validation(UpdateNotePayloadSchema, payload);
      return runWithNoteLock(validatedData.id, async () => {
        return db.update(validatedData);
      });
    });
  });

  ipcMain.handle("note:delete", (e, id: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:delete", LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      return runWithNoteLock(validatedData, async () => {
        return db.delete(validatedData);
      });
    });
  });

  ipcMain.handle("note:getById", (e, id: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:getById", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      return db.getById(validatedData);
    });
  });

  ipcMain.handle("note:getManyById", (e, id: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:getManyById", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdsSchema, id);
      return db.getManyById(validatedData);
    });
  });

  ipcMain.handle("note:pin", (e, id: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:pin", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      return db.togglePin(validatedData);
    });
  });

  ipcMain.handle("note:bookmark", (e, id: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:bookmark", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      return db.toggleBookmark(validatedData);
    });
  });

  ipcMain.handle("views:get", (e, view: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit(`views:get:${view}`, LIMITS.READ_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      switch (view) {
        case "bookmarked":
          return db.getBookMarkedNotes();
        case "pinned":
          return db.getPinnedNotes();
        case "todos":
          return db.getNotesWithActionItems();
        case "all":
          return db.getAll();
        case "untagged":
          return db.getUntaggedNotes();
        default:
          throw new AppBackendError(AppErrorCode.InvalidViewError);
      }
    });
  });

  ipcMain.handle("db-maintenance", (e, action: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("db-maintenance", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
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
          const filePath = await handleDBBackupDialog(win);
          return (await db.backupDb(filePath)).totalPages;
        default: {
          throw new AppBackendError(AppErrorCode.InvalidDbAction);
        }
      }
    });
  });
}

export { registerNoteIpc };
