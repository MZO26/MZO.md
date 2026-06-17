import db from "@electron/db/database";
import {
  deleteAutoExportFile,
  writeAutoExportFile,
} from "@electron/fs/fs-auto-export";
import {
  handleDBBackupDialog,
  handleExportDialog,
  handleExportManyDialog,
  handleImportDialog,
} from "@electron/fs/fs-dialog";
import {
  batchExport,
  batchPDFExport,
  singleExport,
  singlePDFExport,
} from "@electron/fs/fs-export";
import { batchImport } from "@electron/fs/fs-import";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  checkRateLimit,
  measure,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { store } from "@electron/store";
import { LIMITS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import {
  ExportManyRequestSchema,
  ExportRequestSchema,
} from "@shared/schemas/export-schema";
import {
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  IdSchema,
  IdsSchema,
  UpdateNotePayloadSchema,
} from "@shared/schemas/note-schema";
import { BrowserWindow, dialog, ipcMain } from "electron";

function registerNoteIpc(win: BrowserWindow) {
  ipcMain.handle("note:get-all", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("note:get-all", LIMITS.READ_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      return db.getAll();
    });
  });

  ipcMain.handle("note:get-all-backup", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("note:get-all-backup", LIMITS.READ_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      return db.getAllBackup();
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
      const { markdown, ...noteData } = validatedData;
      const result = db.update(noteData);
      const isAutoExport = store.get("auto-export") === true;
      const targetDir = isAutoExport ? store.get("auto-export-path") : null;
      const oldTitle =
        isAutoExport && targetDir
          ? db.getOldNoteTitle(validatedData.id)
          : undefined;
      if (!isAutoExport || !targetDir) return result;
      if (markdown === undefined)
        throw new AppBackendError(AppErrorCode.InvalidData);
      await writeAutoExportFile({
        id: result.id,
        fileName: result.title,
        markdown: markdown,
        targetDir: targetDir,
        oldFileName: oldTitle,
      });
      return result;
    });
  });

  ipcMain.handle("note:delete", (e, id: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:delete", LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      const isAutoExport = store.get("auto-export") === true;
      const targetDir = isAutoExport ? store.get("auto-export-path") : null;
      const oldTitle = db.getOldNoteTitle(validatedData);
      const result = db.delete(validatedData);
      if (!isAutoExport || !targetDir) return result;
      await deleteAutoExportFile(targetDir, validatedData, oldTitle);
      return result;
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

  ipcMain.handle("select:auto-export-folder", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("select:auto-export-folder", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const result = await dialog.showOpenDialog(win, {
        title: "Select Auto Export Directory",
        buttonLabel: "Choose Folder",
        properties: ["openDirectory", "createDirectory"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        throw new AppBackendError(AppErrorCode.CancelledOperation);
      }
      return result.filePaths[0];
    });
  });

  ipcMain.handle("note:import", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("note:import", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const filePaths = await handleImportDialog(win);
      return await batchImport(filePaths);
    });
  });

  ipcMain.handle("note:export-many", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:export-many", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ExportManyRequestSchema, payload);
      const selectedFolder = await handleExportManyDialog(win);
      const hasPdf = validatedData.some(
        (item) => "extension" in item && item.extension === "pdf",
      );
      if (hasPdf) {
        return await batchPDFExport(selectedFolder, validatedData);
      }
      return await batchExport(selectedFolder, validatedData);
    });
  });

  ipcMain.handle("note:export", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:export", LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ExportRequestSchema, payload);
      const data =
        typeof validatedData.content === "string"
          ? validatedData.content
          : JSON.stringify(validatedData.content, null, 2);
      const filePath = await handleExportDialog(win, validatedData);
      if (validatedData.extension === "pdf") {
        return await singlePDFExport(filePath, data);
      }
      return await singleExport(filePath, data);
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
        case "all":
          return db.getAll();
        case "todos":
          return db.getNotesWithActionItems();
        case "untagged":
          return db.getUntaggedNotes();
        case "unlinked":
          return db.getUnlinkedNotes();
        case "hubs":
          return db.getNotesWithMostLinks();
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
