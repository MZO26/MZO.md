import { processWithLimit } from "@electron/concurrent";
import { mainLogger } from "@electron/handler/permission-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import {
  FileNameSchema,
  type ExportContent,
} from "@shared/schemas/request-schema";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { open, rename, unlink } from "node:fs/promises";
import path from "path";

const EXPORT_REGEX = /appimg:\/\/\/([^"' )>\s]+)/g;
const IMPORT_REGEX = /(?:\.\/)?assets\/([^"' )>\s]+)/g;
const RETRYABLE_ERRORS = new Set(["EBUSY", "EPERM", "EACCES"]);

function withRetry<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  retries: number = 2,
) {
  if (!Number.isInteger(retries) || retries <= 0) return fn;
  return async (...args: A): Promise<T> => {
    const start = 100;
    const gr = 1.5;
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn(...args);
      } catch (error: unknown) {
        const err = error as NodeJS.ErrnoException;
        if (i < retries && err.code && RETRYABLE_ERRORS.has(err.code)) {
          mainLogger.devLog(
            `Encountered ${err.code} during operation. Retrying...`,
          );
          const timeout = start * Math.pow(gr, i);
          await new Promise((resolve) => setTimeout(resolve, timeout));
          continue;
        }
        throw error;
      }
    }
    mainLogger.appError("[withRetry]: Encountered unknown error");
    throw new AppBackendError(AppErrorCode.UnknownError);
  };
}

async function writeAtomic(
  targetPath: string,
  content: string | Buffer<ArrayBufferLike>,
) {
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
    throw error;
  }
}

async function sanitizeExportString(
  content: ExportContent["content"],
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
        await fs.promises.copyFile(
          internalPath,
          exportPath,
          fs.constants.COPYFILE_EXCL,
        );
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
        await fs.promises.copyFile(
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

async function getFilePath(
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
  // throwing security check
  const outside = await isInsideDirectory(targetDirectory, absoluteFilePath);
  mainLogger.devLog(outside);
  if (outside) throw new AppBackendError(AppErrorCode.FileWriteError);
  return absoluteFilePath;
}

async function isInsideDirectory(
  baseDir: string,
  absoluteFilePath: string,
  options?: { skipBaseRealpath?: boolean },
) {
  try {
    const basePath = options?.skipBaseRealpath
      ? baseDir
      : await fs.promises.realpath(baseDir);
    const targetPath = await fs.promises.realpath(absoluteFilePath);
    const relative = path.relative(basePath, targetPath);
    const isOutside =
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative);
    return isOutside;
  } catch (error) {
    return false;
  }
}
function isInsideDirectorySync(
  baseDir: string,
  absoluteFilePath: string,
  options?: { skipBaseRealpath?: boolean },
): boolean {
  try {
    const basePath = options?.skipBaseRealpath
      ? baseDir
      : fs.realpathSync(baseDir);
    const targetPath = fs.realpathSync(absoluteFilePath);
    const relative = path.relative(basePath, targetPath);
    return !(
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    );
  } catch (error) {
    return false;
  }
}

export {
  EXPORT_REGEX,
  getFilePath,
  isInsideDirectory,
  isInsideDirectorySync,
  sanitizeExportString,
  sanitizeImportString,
  withRetry,
  writeAtomic,
};
