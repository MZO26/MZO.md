import { sanitizeImportString } from "@electron/fs/fs-helpers";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import { processWithLimit } from "@shared/limiter";
import { ImportRequestSchema } from "@shared/schemas/request-schema";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";

async function batchImport(filePaths: string[]) {
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  await fs.mkdir(imagesFolder, { recursive: true }).catch((error: unknown) => {
    console.error("[sanitizeImportString]: Failed to create directory:", error);
    throw new AppBackendError(AppErrorCode.FileWriteError);
  });
  const imported = await processWithLimit(filePaths, 20, async (file) => {
    try {
      const content = await fs.readFile(file, "utf8");
      const extension = path.extname(file).slice(1).toLowerCase();
      const fileName = path.basename(file, path.extname(file));
      const importedFileDir = path.dirname(file);
      const sanitizedContent = await sanitizeImportString(
        content,
        importedFileDir,
        imagesFolder,
      );
      return validation(ImportRequestSchema, {
        extension,
        fileName,
        content: sanitizedContent,
      });
    } catch (error) {
      console.error(
        `[batchImport]: Failed to read/validate file: ${file}:`,
        error,
      );
      return null;
    }
  });
  return imported.filter((note) => note !== null);
}

export { batchImport };
