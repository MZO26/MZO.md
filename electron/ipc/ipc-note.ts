import db from "@electron/db/database";
import {
  deleteAutoExportFile,
  writeAutoExportFile,
} from "@electron/fs/fs-auto-export";
import {
  handleDBBackupDialog,
  handleDBRestoreDialog,
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
import { checkSyncState } from "@electron/fs/fs-sync";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  checkRateLimit,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { store } from "@electron/store";
import { LIMITS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import {
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  IdSchema,
  IdsSchema,
  UpdateNotePayloadSchema,
} from "@shared/schemas/note-schema";
import {
  ExportManyRequestSchema,
  ExportRequestSchema,
  SyncRequestPayloadSchema,
} from "@shared/schemas/request-schema";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "fs/promises";

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
      if (!checkRateLimit("note:create", LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(CreateNotePayloadSchema, payload);
      return db.create(validatedData);
    });
  });

  ipcMain.handle("note:create-many", (e, payloads: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:create-many", LIMITS.WRITE_HEAVY))
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
      const isAutoExport = store.get("auto-export") === true;
      const targetDir = isAutoExport ? store.get("auto-export-path") : null;
      const oldTitle =
        isAutoExport && targetDir
          ? db.getOldNotes([validatedData.id])
          : undefined;
      const result = db.update(noteData);
      if (!isAutoExport || !targetDir) return result;
      if (markdown === undefined) return result;
      await writeAutoExportFile({
        created_at: result.created_at,
        fileName: result.title,
        markdown: markdown,
        targetDir: targetDir,
        oldFileName: oldTitle?.[0]?.title,
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
      const oldNote = db.getOldNotes([validatedData]);
      const result = db.delete(validatedData);
      if (!isAutoExport || !targetDir) return result;
      await deleteAutoExportFile(targetDir, oldNote);
      return result;
    });
  });

  ipcMain.handle("note:delete-many", (e, ids: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:delete-many", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdsSchema, ids);
      const isAutoExport = store.get("auto-export") === true;
      const targetDir = isAutoExport ? store.get("auto-export-path") : null;
      const oldNotes = db.getOldNotes(validatedData);
      const result = db.deleteMany(validatedData);
      if (!isAutoExport || !targetDir) return result;
      await deleteAutoExportFile(targetDir, oldNotes);
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
      if (!checkRateLimit("note:getManyById", LIMITS.READ_HEAVY))
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

  ipcMain.handle("note:sync", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:sync", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (store.get("auto-export") !== true) return null;
      const validatedData = validation(SyncRequestPayloadSchema, payload);
      if (!validatedData.updated_at) return null;
      const targetDir = store.get("auto-export-path");
      if (!targetDir) return null;
      return await checkSyncState(targetDir, validatedData);
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
      if (!checkRateLimit("note:pin", LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      return db.togglePin(validatedData);
    });
  });

  ipcMain.handle("note:pin-many", (e, ids: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:pin-many", LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdsSchema, ids);
      return db.toggleManyPins(validatedData);
    });
  });

  ipcMain.handle("db-backup", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("db-backup", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const filePath = await handleDBBackupDialog(win);
      return (await db.backupDb(filePath)).totalPages;
    });
  });

  ipcMain.handle("db-backup-restore", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("db-backup-restore", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const backupPath = await handleDBRestoreDialog(win);
      if (!backupPath) throw new AppBackendError(AppErrorCode.InvalidData);
      const stat = await fs.stat(backupPath);
      // sqlite header is exactly 100 bytes long. If file is smaller than that it isn't a valid sqlite db
      if (!stat.isFile() || stat.size < 100) {
        throw new AppBackendError(AppErrorCode.InvalidData);
      }
      const dbPath = db.pathDb();
      const tmpPath = `${dbPath}.${crypto.randomUUID()}.restore-tmp`;
      db.close();
      try {
        await fs.copyFile(backupPath, tmpPath);
        await fs.rename(tmpPath, dbPath);
        await fs.rm(`${dbPath}-wal`, { force: true }).catch(() => {});
        await fs.rm(`${dbPath}-shm`, { force: true }).catch(() => {});
        app.relaunch();
        app.exit(0);
      } catch (error) {
        await fs.rm(tmpPath, { force: true }).catch(() => {});
        db.open();
        throw new AppBackendError(AppErrorCode.FileWriteError);
      }
    });
  });

  ipcMain.handle("db-vacuum", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("db-vacuum", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const dbPath = db.pathDb();
      const before = (await fs.stat(dbPath)).size;
      db.vacuum();
      const after = (await fs.stat(dbPath)).size;
      return Math.max(0, before - after);
    });
  });
}

export { registerNoteIpc };
