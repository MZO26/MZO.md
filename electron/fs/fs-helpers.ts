import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import { processWithLimit } from "@shared/limiter";
import { FileNameSchema } from "@shared/schemas/request-schema";
import fs from "fs/promises";
import { open, rename, unlink, type FileHandle } from "node:fs/promises";
import path from "path";

const EXPORT_REGEX = /appimg:\/\/\/([^"' )>\s]+)/g;
const IMPORT_REGEX = /(?:\.\/)?assets\/([^"' )>\s]+)/g;

async function writeAtomic(
  targetPath: string,
  content: string | Buffer | Uint8Array,
) {
  const tempPath = `${targetPath}.${crypto.randomUUID()}.tmp`;
  let fileHandle: FileHandle | undefined;
  let writeSucceeded = false;
  try {
    // open the temp file for writing
    fileHandle = await open(tempPath, "wx");
    // writes all new data into the temp file. If an error comes up, it jumps to finally and closes the temp file
    await fileHandle?.writeFile(content);
    // flush saves file contents from memory to the fs
    await fileHandle?.datasync();
    writeSucceeded = true;
  } finally {
    await fileHandle?.close();
    if (!writeSucceeded) {
      await unlink(tempPath).catch(() => {});
    }
  }
  // temp file is fully written and closed and gets renamed to targetPath from tempPath
  try {
    await rename(tempPath, targetPath);
  } catch (error) {
    // ignore errors while deleting temp file to throw more important error if save failed
    await unlink(tempPath).catch(() => {});
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
  const YYYY = date.getUTCFullYear();
  const MM = pad(date.getUTCMonth() + 1);
  const DD = pad(date.getUTCDate());
  const HH = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${YYYY}-${MM}-${DD}_${HH}-${mm}-${ss}`;
}

function parseFilenameToDate(
  filename: string,
): { title: string; date: Date } | null {
  const match = filename.match(
    /^(.+)_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/,
  );
  if (!match) return null;
  // first match is the full string
  // second match is title
  const [, title, year, month, day, hour, minute, second] = match;
  if (!title || !year || !month || !day || !hour || !minute || !second) {
    return null;
  }
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1, // month is 0 indexed
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  );
  if (isNaN(date.getTime())) {
    return null;
  }
  return { title, date };
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
  getFilePath,
  getSafeLocalDateString,
  parseFilenameToDate,
  sanitizeExportString,
  sanitizeImportString,
  writeAtomic,
};
