import { sanitizeImportString } from "@electron/fs/fs-assets";
import { validation } from "@electron/ipc/ipc-validation";
import { processWithLimit } from "@shared/limiter";
import {
  ImportRequestSchema,
  type ImportRequest,
} from "@shared/schemas/export-schema";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";

async function batchImport(filePaths: string[]): Promise<ImportRequest[]> {
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  const imported = await processWithLimit(filePaths, 10, async (file) => {
    try {
      const content = await fs.readFile(file, "utf8");
      const extension = path.extname(file).slice(1).toLowerCase();
      const fileName = path.basename(file, path.extname(file));
      const importedFileDir = path.dirname(file);
      const sanitizedContent = sanitizeImportString(
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
  return imported.filter((note): note is ImportRequest => note !== null);
}

export { batchImport };
