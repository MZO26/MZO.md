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
  resolveAutoExport,
  restoreFromBackupPath,
} from "@electron/ipc/ipc-helpers";
import {
  checkRateLimit,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { LIMITS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { DbContentCodec } from "@shared/schemas/editor-schema";
import {
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  DbBoolCodec,
  IdSchema,
  IdsSchema,
  QuerySchema,
  UpdateNotePayloadSchema,
} from "@shared/schemas/note-schema";
import {
  ExportManyRequestSchema,
  ExportRequestSchema,
  FilePathRequestSchema,
  SyncRequestPayloadSchema,
} from "@shared/schemas/request-schema";
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

  ipcMain.handle("note:search", (e, query: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:search", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(QuerySchema, query);
      return db.search.search(validatedData);
    });
  });

  ipcMain.handle("note:create", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:create", LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(CreateNotePayloadSchema, payload);
      const noteData = {
        ...validatedData,
        pinned: DbBoolCodec.encode(validatedData.pinned),
        content: DbContentCodec.encode(validatedData.content),
      };
      return db.create(noteData);
    });
  });

  ipcMain.handle("note:create-many", (e, payloads: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:create-many", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(CreateNotesPayloadsSchema, payloads);
      const noteData = validatedData.map((data) => ({
        ...data,
        pinned: DbBoolCodec.encode(data.pinned),
        content: DbContentCodec.encode(data.content),
      }));
      return db.createMany(noteData);
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
      const noteData = {
        ...validatedData,
        content: DbContentCodec.encode(validatedData.content),
      };
      const { markdown, ...dbPayload } = noteData;
      const { targetDir, isAutoExport } = resolveAutoExport();
      const oldTitle =
        isAutoExport && targetDir
          ? db.getOldNotes([validatedData.id])
          : undefined;
      const result = db.update(dbPayload);
      if (!isAutoExport || !targetDir) return result;
      if (!markdown) return result;
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
      const { targetDir, isAutoExport } = resolveAutoExport();
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
      const { targetDir, isAutoExport } = resolveAutoExport();
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
      const validatedData = validation(SyncRequestPayloadSchema, payload);
      if (!validatedData.updated_at) return null;
      const { targetDir, isAutoExport } = resolveAutoExport();
      if (!targetDir || !isAutoExport) return null;
      return await checkSyncState(targetDir, validatedData);
    });
  });

  ipcMain.handle("note:import", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:import", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(FilePathRequestSchema, payload);
      const filePaths =
        validatedData.source === "dialog"
          ? await handleImportDialog(win)
          : validatedData.source === "external"
            ? validatedData.filePaths
            : [];
      if (filePaths.length === 0) {
        throw new AppBackendError(AppErrorCode.CancelledOperation);
      }
      return await batchImport(filePaths);
    });
  });

  ipcMain.handle("note:export-many", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:export-many", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ExportManyRequestSchema, payload);
      const selectedFolder = await handleExportManyDialog(win);
      const isPdf = validatedData.every((item) => item.extension === "pdf");
      if (isPdf) {
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
        return await singlePDFExport(filePath, data, validatedData.landscape);
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
      return await db.backupDb(filePath);
    });
  });

  ipcMain.handle("db-backup-restore", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("db-backup-restore", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const backupPath = await handleDBRestoreDialog(win);
      if (!backupPath) throw new AppBackendError(AppErrorCode.InvalidData);
      return await restoreFromBackupPath(backupPath);
    });
  });
}

export { registerNoteIpc };
