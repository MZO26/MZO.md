import { processWithLimit } from "@electron/concurrent";
import { mainLogger } from "@electron/handler/permission-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import {
  FileNameSchema,
  type ExportRequest,
} from "@shared/schemas/request-schema";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { open, rename, unlink } from "node:fs/promises";
import path from "path";

const EXPORT_REGEX = /appimg:\/\/\/([^"' )>\s]+)/g;
const IMPORT_REGEX = /(?:\.\/)?assets\/([^"' )>\s]+)/g;
const RETRYABLE_ERRORS = new Set(["EBUSY", "EPERM", "EACCES"]);

/**
 * Wraps an async function with automatic retry and exponential backoff.
 *
 * Only retries on transient OS errors (`EBUSY`, `EPERM`, `EACCES`).
 * All other errors are re-thrown immediately. Backoff schedule:
 * `100ms × 1.5^attempt`.
 *
 * @param fn - The async function to protect.
 * @param retries - Maximum number of retries (default `2`). If ≤ 0, the original function is returned unchanged.
 * @returns A wrapped function with the same signature.
 *
 * @example
 * const safeCopy = withRetry(() => fs.promises.copyFile(src, dest), 3);
 * await safeCopy(); // retries up to 3× on EBUSY/EPERM/EACCES
 */

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

/**
 * Atomically writes content to a target file.
 *
 * Writes to a temporary file (suffixed with a random UUID), flushes data
 * to disk via `datasync()`, then renames the temp file over the target.
 * On failure the temp file is best-effort cleaned up and the original
 * error is re-thrown.
 *
 * @param targetPath - Destination file path.
 * @param content - Data to write.
 * @throws If the write, sync, or rename fails.
 *
 * @example
 * await writeAtomic("/tmp/out.txt", "hello");
 * await writeAtomic("/tmp/img.png", buffer);
 */

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

/**
 * Rewrites internal file references in a document to portable `assets/`
 * paths and copies the referenced files into the export directory.
 *
 * Uses a concurrency limit of 5 for file copies. Existing target files
 * are left untouched (`COPYFILE_EXCL`); missing source files are silently
 * skipped.
 *
 * @param content - Document content containing internal file references.
 * @param assetsDir - Destination directory for exported assets.
 * @param internalImgDir - Source directory where internal images reside.
 * @returns The content with all file references rewritten to `assets/<name>`.
 *
 * @example
 * const html = await sanitizeExportString(raw, "/tmp/export/assets", "/var/img");
 */

async function sanitizeExportString(
  content: ExportRequest["content"],
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

/**
 * Rewrites portable `assets/` file references in imported content to
 * internal `appimg:///` paths and copies the referenced files into the
 * internal image directory.
 *
 * Inverse of {@link sanitizeExportString}. Uses a concurrency limit of 5
 * for file copies. Existing target files are left untouched; missing
 * source files are silently skipped.
 *
 * @param importedContent - Document content containing portable `assets/` references.
 * @param importedFileDir - Root directory of the imported package (files expected under `assets/`).
 * @param internalImgDir - Internal image storage directory.
 * @returns The content with all file references rewritten to `appimg:///<name>`.
 *
 * @example
 * const html = await sanitizeImportString(raw, "/tmp/import", "/var/img");
 */

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

/**
 * Resolves a validated, safe absolute file path inside a target directory.
 *
 * Validates the file name against {@link FileNameSchema}, appends the
 * extension (defaulting to `"md"`), and verifies via
 * {@link isInsideDirectory} that the resolved path does not escape the
 * target directory (Path Traversal guard).
 *
 * @param targetDirectory - Directory in which the file will reside.
 * @param payload.fileName - User-supplied file name (without extension); validated and sanitized.
 * @param payload.extension - File extension without leading dot (e.g. `"md"`); falls back to `"md"`.
 * @returns Absolute, traversal-safe file path.
 * @throws {AppBackendError} If the resolved path escapes `targetDirectory`.
 *
 * @example
 * const p = await getFilePath("/var/exports", { fileName: "my report", extension: "html" });
 * // "/var/exports/my-report.html"
 */

async function getFilePath(
  targetDirectory: string,
  payload: {
    fileName: string;
    extension: ExportRequest["extension"];
  },
) {
  const extension = payload.extension ?? "md";
  const safeTitle = validation(FileNameSchema, payload.fileName);
  const newFileName = `${safeTitle}.${extension}`;
  const absoluteFilePath = path.resolve(targetDirectory, newFileName);
  const inside = await isInsideDirectory(targetDirectory, absoluteFilePath);
  if (!inside) throw new AppBackendError(AppErrorCode.FileWriteError);
  return absoluteFilePath;
}

/**
 * Checks whether a file path resolves to a location inside a base directory.
 *
 * Resolves symlinks on both paths via `realpath` to prevent directory
 * escape through symbolic links. If the target file does not yet exist,
 * the parent directory is resolved instead and the basename re-appended.
 * Fails closed: any unexpected error results in `false`.
 *
 * @param baseDir - The directory that must contain the target path.
 * @param absoluteFilePath - Absolute path to check.
 * @param options.skipBaseRealpath - If `true`, skip symlink resolution for `baseDir` (use `path.resolve` only).
 * @returns `true` if the target is inside the base directory, `false` otherwise.
 *
 * @example
 * await isInsideDirectory("/var/exports", "/var/exports/report.md"); // true
 * await isInsideDirectory("/var/exports", "/etc/passwd");            // false
 * await isInsideDirectory("/var/exports", "/var/escape/link.md");    // false (symlink escape)
 */

async function isInsideDirectory(
  baseDir: string,
  absoluteFilePath: string,
  options?: { skipBaseRealpath?: boolean },
): Promise<boolean> {
  try {
    const basePath = options?.skipBaseRealpath
      ? path.resolve(baseDir)
      : await fs.promises.realpath(baseDir);
    let targetPath: string;
    try {
      targetPath = await fs.promises.realpath(absoluteFilePath);
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") throw err;
      const parentReal = await fs.promises.realpath(
        path.dirname(absoluteFilePath),
      );
      targetPath = path.join(parentReal, path.basename(absoluteFilePath));
    }
    const relative = path.relative(basePath, targetPath);
    const inside = !(
      relative === "" ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    );
    return inside;
  } catch {
    return false;
  }
}

/**
 * Synchronous version of {@link isInsideDirectory}.
 *
 * Resolves symlinks on both paths via `realpathSync` to prevent directory
 * escape through symbolic links. If the target file does not yet exist,
 * the parent directory is resolved instead and the basename re-appended.
 * Fails closed: any unexpected error results in `false`.
 *
 * @param baseDir - The directory that must contain the target path.
 * @param absoluteFilePath - Absolute path to check.
 * @param options.skipBaseRealpath - If `true`, skip symlink resolution for `baseDir`.
 * @returns `true` if the target is strictly inside the base directory, `false` otherwise.
 *
 * @example
 * isInsideDirectorySync("/var/exports", "/var/exports/report.md"); // true
 * isInsideDirectorySync("/var/exports", "/etc/passwd");           // false
 * isInsideDirectorySync("/var/exports", "/var/escape/link.md");   // false (symlink escape)
 */

function isInsideDirectorySync(
  baseDir: string,
  absoluteFilePath: string,
  options?: { skipBaseRealpath?: boolean },
): boolean {
  try {
    const basePath = options?.skipBaseRealpath
      ? baseDir
      : fs.realpathSync(baseDir);
    let targetPath: string;
    try {
      targetPath = fs.realpathSync(absoluteFilePath);
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") throw err;
      const parentReal = fs.realpathSync(path.dirname(absoluteFilePath));
      targetPath = path.join(parentReal, path.basename(absoluteFilePath));
    }
    const relative = path.relative(basePath, targetPath);
    const inside = !(
      relative === "" ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    );
    return inside;
  } catch {
    return false;
  }
}

/**
 * Ensures unique file names within a batch of export requests.
 *
 * Comparison is case-insensitive. On collision, a counter suffix is
 * inserted before the extension: `"report.md"` → `"report (1).md"`.
 * The original array is not mutated.
 *
 * @param payload - Array of export requests to deduplicate.
 * @returns A new array with guaranteed-unique file names.
 *
 * @example
 * dedupeFileNames([
 *   { fileName: "report.md" },
 *   { fileName: "Report.md" },
 *   { fileName: "report.md" },
 * ]);
 * // [{ fileName: "report.md" }, { fileName: "Report (1).md" }, { fileName: "report (2).md" }]
 */

function dedupeFileNames(payload: ExportRequest[]) {
  const usedNames = new Set<string>();
  const updatedPayload: ExportRequest[] = [];
  for (const p of payload) {
    let fileName = p.fileName;
    if (usedNames.has(fileName.toLowerCase())) {
      const dotIndex = fileName.lastIndexOf(".");
      const stem = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
      const extension = dotIndex > 0 ? fileName.slice(dotIndex) : "";
      let count = 1;
      do {
        fileName = `${stem} (${count})${extension}`;
        count++;
      } while (usedNames.has(fileName.toLowerCase()));
    }
    usedNames.add(fileName.toLowerCase());
    updatedPayload.push({ ...p, fileName });
  }
  return updatedPayload;
}

export {
  dedupeFileNames,
  getFilePath,
  isInsideDirectory,
  isInsideDirectorySync,
  sanitizeExportString,
  sanitizeImportString,
  withRetry,
  writeAtomic,
};
