import db from "@electron/db/database";
import { restoreFromBackupPath } from "@electron/fs/fs-backup";
import {
  handleDBBackupDialog,
  handleDBRestoreDialog,
  handleExportDialog,
  handleExportManyDialog,
  handleImportDialog,
} from "@electron/fs/fs-dialog";
import { batchExport, singleExport, singlePDFExport } from "@electron/fs/fs-export";
import { removeUnusedImages } from "@electron/fs/fs-image";
import { batchImport } from "@electron/fs/fs-import";
import { LinkAppState } from "@electron/handler/link-handler";
import { mainLogger } from "@electron/handler/permission-handler";
import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import {
  checkRateLimit,
  LIMITS,
  validateSender,
  validation,
  withErrorHandling,
} from "@electron/ipc/ipc-validation";
import { clearFlushTimeout, FlushAppState, win } from "@electron/main";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import { DbContentCodec } from "@shared/schemas/editor-schema";
import {
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  DbBoolCodec,
  IdSchema,
  IdsSchema,
  isFlush,
  QuerySchema,
  RelatedNotesSchema,
  UpdateNotePayloadSchema,
} from "@shared/schemas/note-schema";
import {
  ExportManyRequestSchema,
  ExportRequestSchema,
  FilePathRequestSchema,
} from "@shared/schemas/request-schema";
import { ipcMain } from "electron";
import { BrowserWindow } from "electron/main";

function registerNoteIpc() {
  ipcMain.on(IPC_CHANNELS.CONFIRM_FLUSH, (event) => {
    const currentWin = BrowserWindow.fromWebContents(event.sender);
    if (!currentWin || currentWin.isDestroyed() || currentWin !== win) return;
    if (!FlushAppState.isFlushing) return;
    clearFlushTimeout();
    FlushAppState.isReadyToClose = true;
    FlushAppState.isFlushing = false;
    currentWin.close();
  });

  ipcMain.handle(
    IPC_CHANNELS.GET_PENDING_OPEN,
    withErrorHandling((e) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.GET_PENDING_OPEN, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      LinkAppState.rendererReady = true;
      const pending = LinkAppState.queued;
      LinkAppState.queued = null;
      return pending;
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_ALL_NOTES,
    withErrorHandling((e) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.GET_ALL_NOTES, LIMITS.READ_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      return db.getAll();
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_ALL_NOTES_BACKUP,
    withErrorHandling((e) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.GET_ALL_NOTES_BACKUP, LIMITS.READ_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      return db.getAllBackup();
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_SEARCH,
    withErrorHandling((e, query: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_SEARCH, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(QuerySchema, query);
      return db.getSearch().search(validatedData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_CREATE,
    withErrorHandling((e, payload: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_CREATE, LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(CreateNotePayloadSchema, payload);
      const noteData = {
        ...validatedData,
        pinned: DbBoolCodec.encode(validatedData.pinned),
        content: DbContentCodec.encode(validatedData.content),
      };
      return db.create(noteData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_CREATE_MANY,
    withErrorHandling((e, payloads: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_CREATE_MANY, LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(CreateNotesPayloadsSchema, payloads);
      const noteData = validatedData.map((data) => ({
        ...data,
        pinned: DbBoolCodec.encode(data.pinned),
        content: DbContentCodec.encode(data.content),
      }));
      return db.createMany(noteData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_UPDATE,
    withErrorHandling(async (e, payload: unknown, options: { flush?: boolean }) => {
      validateSender(e);
      const flush = isFlush(options);
      if (!flush) {
        if (!checkRateLimit(IPC_CHANNELS.NOTE_UPDATE, LIMITS.WRITE_LIGHT))
          throw new AppBackendError(AppErrorCode.RateLimitError);
      } else {
        if (!checkRateLimit(IPC_CHANNELS.NOTE_UPDATE_FLUSH, LIMITS.WRITE_FLUSH)) {
          throw new AppBackendError(AppErrorCode.RateLimitError);
        }
      }
      const validatedData = validation(UpdateNotePayloadSchema, payload);
      const noteData = {
        ...validatedData,
        content: DbContentCodec.encode(validatedData.content),
      };
      const { result, imageDiff } = db.update(noteData);
      if (imageDiff.length > 0) {
        await removeUnusedImages(imageDiff);
      }
      return result;
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_DELETE,
    withErrorHandling((e, id: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_DELETE, LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      return db.delete(validatedData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_DELETE_MANY,
    withErrorHandling((e, ids: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_DELETE_MANY, LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdsSchema, ids);
      return db.deleteMany(validatedData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_GET_BY_ID,
    withErrorHandling((e, id: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_GET_BY_ID, LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      return db.getById(validatedData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_GET_MANY_BY_ID,
    withErrorHandling((e, id: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_GET_MANY_BY_ID, LIMITS.READ_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdsSchema, id);
      return db.getManyById(validatedData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_GET_RELATED_NOTES,
    withErrorHandling((e, payload: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_GET_RELATED_NOTES, LIMITS.READ_NORMAL))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(RelatedNotesSchema, payload);
      return db.getRelatedNotes(validatedData.id);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_IMPORT,
    withErrorHandling(async (e, payload: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_IMPORT, LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win || win.isDestroyed()) throw new AppBackendError(AppErrorCode.UnknownError);
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
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_EXPORT_MANY,
    withErrorHandling(async (e, payload: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_EXPORT_MANY, LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win || win.isDestroyed()) throw new AppBackendError(AppErrorCode.UnknownError);
      const validatedData = validation(ExportManyRequestSchema, payload);
      const selectedFolder = await handleExportManyDialog(win);
      return await batchExport(selectedFolder, validatedData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_EXPORT,
    withErrorHandling(async (e, payload: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_EXPORT, LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win || win.isDestroyed()) throw new AppBackendError(AppErrorCode.UnknownError);
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
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_PIN,
    withErrorHandling((e, id: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_PIN, LIMITS.WRITE_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdSchema, id);
      return db.togglePin(validatedData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.NOTE_PIN_MANY,
    withErrorHandling((e, ids: unknown) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.NOTE_PIN_MANY, LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(IdsSchema, ids);
      return db.toggleManyPins(validatedData);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_BACKUP,
    withErrorHandling(async (e) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.DB_BACKUP, LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win || win.isDestroyed()) throw new AppBackendError(AppErrorCode.UnknownError);
      const filePath = await handleDBBackupDialog(win);
      return await db.backupDb(filePath);
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_BACKUP_RESTORE,
    withErrorHandling(async (e) => {
      validateSender(e);
      if (!checkRateLimit(IPC_CHANNELS.DB_BACKUP_RESTORE, LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win || win.isDestroyed()) throw new AppBackendError(AppErrorCode.UnknownError);
      const backupPath = await handleDBRestoreDialog(win);
      if (!backupPath) throw new AppBackendError(AppErrorCode.InvalidData);
      return await restoreFromBackupPath(backupPath);
    }),
  );
  mainLogger.devLog("[registerIpc]: Note IPC registered");
}

export { registerNoteIpc };
