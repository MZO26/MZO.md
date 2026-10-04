import { mainLogger } from "@electron/handler/permission-handler";
import { processWithLimit } from "@electron/helpers";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import {
  FileNameSchema,
  type ExportContent,
} from "@shared/schemas/request-schema";
import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import { open, rename, unlink } from "node:fs/promises";
import path from "path";

const EXPORT_REGEX = /appimg:\/\/\/([^"' )>\s]+)/g;
const IMPORT_REGEX = /(?:\.\/)?assets\/([^"' )>\s]+)/g;

async function writeAtomic(
  targetPath: string,
  content: string | Buffer | Uint8Array,
): Promise<void> {
  const tempPath = `${targetPath}.${randomUUID()}.tmp`;
  try {
    const file = await open(tempPath, "wx");
    try {
      await file.writeFile(content);
      await file.datasync();
    } finally {
      await file.close();
    }
    await rename(tempPath, targetPath);
  } catch (error) {
    await unlink(tempPath).catch((error) => {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT")
        mainLogger.appError("[writeAtomic]: Failed to delete temp file", err);
    });
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
}

async function sanitizeExportString(
  content: string,
  assetsDir: string,
  internalImgDir: string,
) {
  const fileNames = new Set<string>();
  const portableContent = content.replace(EXPORT_REGEX, (_match, fileName) => {
    fileNames.add(fileName);
    return `assets/${fileName}`;
  });
  if (fileNames.size > 0) {
    await processWithLimit([...fileNames], 5, async (fileName) => {
      const internalPath = path.join(internalImgDir, fileName);
      const exportPath = path.join(assetsDir, fileName);
      try {
        await fs.copyFile(internalPath, exportPath, fs.constants.COPYFILE_EXCL);
      } catch (error: unknown) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "EEXIST") return;
        if (err.code !== "ENOENT") {
          mainLogger.appError(
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
    await processWithLimit([...fileNames], 5, async (fileName) => {
      const sourceImagePath = path.join(importedFileDir, "assets", fileName);
      const destImagePath = path.join(internalImgDir, fileName);
      try {
        await fs.copyFile(
          sourceImagePath,
          destImagePath,
          fs.constants.COPYFILE_EXCL,
        );
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "EEXIST") return;
        if (err.code !== "ENOENT")
          mainLogger.appError(
            "[sanitizeImportString]: Failed to copy file:",
            err.code,
          );
      }
    });
  }
  return internalContent;
}

function getFilePath(
  targetDirectory: string,
  payload: {
    fileName: string;
    extension: ExportContent["extension"];
  },
) {
  const extension = payload.extension ?? "md";
  const safeTitle = validation(FileNameSchema, payload.fileName);
  const newFileName = `${safeTitle}.${extension}`;
  const absoluteFilePath = path.resolve(targetDirectory, newFileName);
  // security check
  ensureInsideDirectory(targetDirectory, absoluteFilePath);
  return absoluteFilePath;
}

// doesn't check for symlinks (adds extra i/o)
function ensureInsideDirectory(baseDir: string, absoluteFilePath: string) {
  const relative = path.relative(baseDir, absoluteFilePath);
  const isOutside =
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);
  if (isOutside) {
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
}

export {
  ensureInsideDirectory,
  EXPORT_REGEX,
  getFilePath,
  sanitizeExportString,
  sanitizeImportString,
  writeAtomic,
};
