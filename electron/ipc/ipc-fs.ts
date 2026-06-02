import {
  handleExportDialog,
  handleExportManyDialog,
  handleImportDialog,
} from "@electron/fs/fs-dialog";
import { batchExport, singleExport } from "@electron/fs/fs-export";
import { batchPDFExport, singlePDFExport } from "@electron/fs/fs-export-pdf";
import { handleImageWrite } from "@electron/fs/fs-image";
import { batchImport } from "@electron/fs/fs-import";
import {
  checkSyncState,
  deleteSyncedNote,
  writeSyncedNote,
} from "@electron/fs/fs-sync";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  checkRateLimit,
  result,
  validation,
} from "@electron/ipc/ipc-validation";
import { store } from "@electron/store";
import { LIMITS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { lastSyncedTitle, runWithNoteLock } from "@shared/limiter";
import {
  DeleteSyncRequestSchema,
  ExportManyRequestSchema,
  ExportRequestSchema,
  SyncRequestSchema,
  WriteSyncRequestSchema,
} from "@shared/schemas/export-schema";
import { ImagePayloadSchema } from "@shared/schemas/image-schema";
import { dialog, ipcMain, type BrowserWindow } from "electron";

function registerFileIpc(win: BrowserWindow) {
  ipcMain.handle("sync-folder:open", (e) => {
    return result(e, async () => {
      if (!checkRateLimit("sync-folder:open", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const result = await dialog.showOpenDialog(win, {
        title: "Select Sync Directory",
        buttonLabel: "Choose Folder",
        properties: ["openDirectory", "createDirectory"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        throw new AppBackendError(AppErrorCode.CancelledOperation);
      }
      return result.filePaths[0];
    });
  });

  ipcMain.handle("note:sync-write", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:sync-write", LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (store.get("sync-mode") !== true) return false;
      const targetDir = store.get("sync-path");
      if (!targetDir) return false;
      const validatedData = validation(WriteSyncRequestSchema, payload);
      return runWithNoteLock(validatedData.id, async () => {
        const effectivePreviousTitle =
          lastSyncedTitle.get(validatedData.id) ?? validatedData.previousTitle;
        const writtenTitle = await writeSyncedNote(targetDir, {
          ...validatedData,
          previousTitle: effectivePreviousTitle,
        });
        lastSyncedTitle.set(validatedData.id, writtenTitle);
        return true;
      });
    });
  });

  ipcMain.handle("note:sync-delete", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:sync-delete", LIMITS.WRITE_STANDARD))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (store.get("sync-mode") !== true) return false;
      const targetDir = store.get("sync-path");
      if (!targetDir) return false;
      const validatedData = validation(DeleteSyncRequestSchema, payload);
      return runWithNoteLock(validatedData.id, async () => {
        const effectiveFileName =
          lastSyncedTitle.get(validatedData.id) ?? validatedData.fileName;
        await deleteSyncedNote(targetDir, {
          ...validatedData,
          fileName: effectiveFileName,
        });
        lastSyncedTitle.delete(validatedData.id);
        return true;
      });
    });
  });

  ipcMain.handle("note:sync", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("note:sync", LIMITS.READ_LIGHT))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      if (store.get("sync-mode") !== true) return null;
      const validatedData = validation(SyncRequestSchema, payload);
      if (!validatedData.updated_at) return null;
      const targetDir = store.get("sync-path");
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

  ipcMain.handle("image:write", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("image:write", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ImagePayloadSchema, payload);
      return await handleImageWrite(validatedData);
    });
  });
}

export { registerFileIpc };
