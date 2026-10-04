import { sanitizeImportString } from "@electron/fs/fs-helpers";
import { mainLogger } from "@electron/handler/permission-handler";
import { processWithLimit } from "@electron/helpers";
import { validation } from "@electron/ipc/ipc-validation";
import {
  ImportRequestSchema,
  type ImportRequest,
} from "@shared/schemas/request-schema";
import { MAX_BYTES_FILE, MAX_CHARACTERS } from "@shared/shared-constants";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";

async function batchImport(filePaths: string[]) {
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  await fs.mkdir(imagesFolder, { recursive: true });
  const uniqueFilePaths = Array.from(new Set<string>(filePaths));
  const seenFileNames = new Set<string>();
  let duplicateCount = 0;
  let errorCount = 0;
  const imported = await processWithLimit(
    [...uniqueFilePaths],
    3,
    async (file): Promise<ImportRequest | null> => {
      try {
        const stats = await fs.stat(file);
        if (!stats.isFile() || stats.size > MAX_BYTES_FILE) {
          ++errorCount;
          return null;
        }
        const extname = path.extname(file);
        const fileName = path.basename(file, extname);
        if (seenFileNames.has(fileName.toLowerCase())) {
          ++duplicateCount;
          return null;
        }
        seenFileNames.add(fileName.toLowerCase());

        const content = await fs.readFile(file, "utf8");
        mainLogger.devLog(`Content length: ${content.length} characters`);
        if (content.length > MAX_CHARACTERS) {
          ++errorCount;
          return null;
        }
        const importedFileDir = path.dirname(file);
        const extension = extname.slice(1).toLowerCase();
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
        mainLogger.appError(
          `[batchImport]: Failed to read/validate file: ${file}:`,
          error,
        );
        ++errorCount;
        return null;
      }
    },
  );
  const validNotes = imported.filter(
    (note): note is ImportRequest => note !== null,
  );
  mainLogger.devLog(
    `[batchImport]: Successfully imported ${validNotes.length} notes.`,
  );
  mainLogger.devLog(
    `[batchImport]: ${duplicateCount} duplicates and ${errorCount} errors encountered.`,
  );
  return {
    data: validNotes,
    stats: {
      total: filePaths.length,
      duplicates: duplicateCount,
      errors: errorCount,
    },
  };
}

export { batchImport };
