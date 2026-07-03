import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import { processWithLimit } from "@shared/limiter";
import { FileNameSchema } from "@shared/schemas/request-schema";
import fs from "fs/promises";
import path from "path";

const EXPORT_REGEX = /appimg:\/\/\/([^"' )>\s]+)/g;
const IMPORT_REGEX = /(?:\.\/)?assets\/([^"' )>\s]+)/g;

async function sanitizeExportString(
  content: string,
  exportDir: string,
  internalImgDir: string,
) {
  const assetsDir = path.join(exportDir, "assets");
  const fileNames = new Set<string>();
  const portableContent = content.replace(EXPORT_REGEX, (_match, fileName) => {
    fileNames.add(fileName);
    return `assets/${fileName}`;
  });
  if (fileNames.size > 0) {
    await fs.mkdir(assetsDir, { recursive: true }).catch((error: unknown) => {
      console.error(
        "[sanitizeExportString]: Failed to create directory:",
        error,
      );
      throw new AppBackendError(AppErrorCode.FileWriteError);
    });
    await processWithLimit([...fileNames], 20, async (fileName) => {
      const internalPath = path.join(internalImgDir, fileName);
      const exportPath = path.join(assetsDir, fileName);
      try {
        await fs.copyFile(internalPath, exportPath);
      } catch (error: unknown) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== "ENOENT") {
          console.error(
            "[sanitizeExportString]: Failed to copy file",
            err.code,
          );
        }
      }
    });
  }
  return portableContent;
}

async function sanitizeImportString(
  importedContent: string,
  importedFileDir: string,
  internalImgDir: string,
) {
  const fileNames = new Set<string>();
  const internalContent = importedContent.replace(
    IMPORT_REGEX,
    (_match, fileName) => {
      fileNames.add(fileName);
      return `appimg:///${fileName}`;
    },
  );
  if (fileNames.size > 0) {
    await fs
      .mkdir(internalImgDir, { recursive: true })
      .catch((error: unknown) => {
        console.error(
          "[sanitizeImportString]: Failed to create directory:",
          error,
        );
        throw new AppBackendError(AppErrorCode.FileWriteError);
      });
    await processWithLimit([...fileNames], 20, async (fileName) => {
      const sourceImagePath = path.join(importedFileDir, "assets", fileName);
      const destImagePath = path.join(internalImgDir, fileName);
      try {
        await fs.copyFile(sourceImagePath, destImagePath);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== "ENOENT")
          console.error(
            "[sanitizeImportString]: Failed to copy file:",
            err.code,
          );
      }
    });
  }

  return internalContent;
}

function getSafeLocalDateString(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}-${MM}-${DD}_${HH}-${mm}-${ss}`;
}

function getFilePath(
  targetDirectory: string,
  payload: { fileName: string; created_at: string; extension: string },
) {
  const extension = payload.extension ?? "md";
  const creationDate = new Date(payload.created_at);
  const safeDate = getSafeLocalDateString(creationDate);
  const safeTitle = validation(FileNameSchema, payload.fileName);
  const newFileName = `${safeTitle}_${safeDate}.${extension}`;
  const absoluteFilePath = path.resolve(targetDirectory, newFileName);
  // security check
  ensureInsideDirectory(targetDirectory, absoluteFilePath);
  return absoluteFilePath;
}

function ensureInsideDirectory(baseDir: string, absoluteFilePath: string) {
  const relative = path.relative(baseDir, absoluteFilePath);
  const isOutside = relative.startsWith("..") || path.isAbsolute(relative);
  if (isOutside) {
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
}

export {
  ensureInsideDirectory,
  getFilePath,
  getSafeLocalDateString,
  sanitizeExportString,
  sanitizeImportString,
};
