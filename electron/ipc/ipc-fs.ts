import {
  handleExportDialog,
  handleExportManyDialog,
  handleImportDialog,
} from "@electron/fs/fs-dialog";
import { batchExport, singleExport } from "@electron/fs/fs-export";
import { batchPDFExport, singlePDFExport } from "@electron/fs/fs-export-pdf";
import { handleImageWrite } from "@electron/fs/fs-image";
import { batchImport } from "@electron/fs/fs-import";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { checkRateLimit, result } from "@electron/ipc/ipc-validation";
import { AppErrorCode, LIMITS } from "@shared/constants";
import { validation } from "@shared/ipc-helpers";
import {
  ExportManyRequestSchema,
  ExportRequestSchema,
} from "@shared/schemas/export-schema";
import { ImagePayloadSchema } from "@shared/schemas/image-schema";
import { ipcMain, type BrowserWindow } from "electron";

function registerFileIpc(win: BrowserWindow) {
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

  ipcMain.handle("save:image", (e, payload: unknown) => {
    return result(e, async () => {
      if (!checkRateLimit("save:image", LIMITS.WRITE_HEAVY))
        throw new AppBackendError(AppErrorCode.RateLimitError);
      const validatedData = validation(ImagePayloadSchema, payload);
      const result = await handleImageWrite(validatedData);
      return result;
    });
  });
}

export { registerFileIpc };
