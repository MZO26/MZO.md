import db from "@electron/db/database";
import {
  getFilePath,
  sanitizeExportString,
  writeAtomic,
} from "@electron/fs/fs-helpers";
import { mainLogger } from "@electron/handler/permission-handler";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { resolveAutoExport } from "@electron/ipc/ipc-helpers";
import { validation } from "@electron/ipc/ipc-validation";
import { CONCURRENCY_DELETE } from "@shared/constants/main-constants";
import { AppErrorCode } from "@shared/errors";
import { processWithLimit } from "@shared/limiter";
import {
  IdSchema,
  type AutoExportWritePayload,
  type Id,
  type Note,
} from "@shared/schemas/note-schema";
import {
  DeleteAutoExportRequestSchema,
  WriteAutoExportRequestSchema,
  type DeleteAutoExportRequest,
  type WriteAutoExportRequest,
} from "@shared/schemas/request-schema";
import type { Expand } from "@shared/types";
import { app, shell } from "electron";
import { constants } from "fs";
import fs from "fs/promises";
import path from "path";

async function isAutoExport(id: Id): Promise<boolean> {
  try {
    const { targetDir, isAutoExport } = resolveAutoExport();
    if (!targetDir || !isAutoExport) return false;
    const validatedData = validation(IdSchema, id);
    const notes = db.getOldNotes([validatedData]);
    const note = Array.isArray(notes) ? notes[0] : undefined;
    if (!note) return false;
    const exportPath = resolveAutoExportPath(targetDir);
    const absoluteFilePath = getFilePath(exportPath, {
      created_at: note.created_at,
      fileName: note.title,
      extension: "md",
    });
    if (!absoluteFilePath) return false;
    try {
      await fs.access(absoluteFilePath, fs.constants.F_OK);
      mainLogger.devLog("[isAutoExport]: This note is on the file system.", id);
      return true;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        mainLogger.devLog(
          "[isAutoExport]: This note is not on the file system yet.",
          id,
        );
        return false;
      }
      throw error;
    }
  } catch (error) {
    mainLogger.appError(
      "[isAutoExport]: Failed to detect if note is on file system:",
      error,
    );
    throw new AppBackendError(AppErrorCode.UnknownError);
  }
}

function normalizeText(content: string | null | undefined) {
  if (!content) return "";
  const cleaned = content
    // strip the UTF-8 byte mark
    .replace(/^\uFEFF/, "")
    // for single, precomposed characters that could trigger false positives
    .normalize("NFC")
    // forces line-break to be \n
    .replace(/\r\n|\r/g, "\n")
    // remove white spaces at end of file
    .trimEnd();
  // to respect POSIX standard: append one empty newline at the end
  return cleaned ? cleaned + "\n" : "";
}

async function safeRename(
  oldAbsoluteFilePath: string,
  absoluteFilePath: string,
) {
  if (!oldAbsoluteFilePath || oldAbsoluteFilePath === absoluteFilePath) return;
  const src = oldAbsoluteFilePath.normalize("NFC");
  const dest = absoluteFilePath.normalize("NFC");
  try {
    const sameIgnoringCase = src.toLowerCase() === dest.toLowerCase();
    if (sameIgnoringCase) {
      const temp = `${dest}.${crypto.randomUUID()}.rename-tmp`;
      await fs.rename(src, temp);
      try {
        await fs.rename(temp, dest);
      } catch (error) {
        await fs.rename(temp, src).catch(() => {});
        throw error;
      }
    } else {
      await fs.rename(src, dest);
    }
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      mainLogger.appError(
        "[writeAutoExportFileLogic -> safeRename]: File not found",
      );
      return;
    } else if (err.code === "EXDEV") {
      // for cross-partition moves
      try {
        await fs.copyFile(src, dest);
        await fs.unlink(src);
      } catch (error) {
        mainLogger.appError(
          "[writeAutoExportFileLogic -> safeRename]: EXDEV  fallback failed",
          error,
        );
        throw new AppBackendError(AppErrorCode.FileWriteError);
      }
    } else {
      mainLogger.appError(
        "[writeAutoExportFileLogic -> safeRename]: Safe rename failed",
        error,
      );
      throw new AppBackendError(AppErrorCode.FileWriteError);
    }
  }
}

function resolveAutoExportPath(targetDir: string) {
  const normalized = path.resolve(targetDir);
  const baseName = path.basename(normalized).toLowerCase();
  return baseName === "mzo notes"
    ? normalized
    : path.join(normalized, "MZO Notes");
}

async function writeAutoExportFileLogic(
  targetDir: string,
  payload: WriteAutoExportRequest,
) {
  const { created_at, fileName, oldFileName, extension, content } = payload;
  const exportPath = resolveAutoExportPath(targetDir);
  const assetsDir = path.join(exportPath, "assets");
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  try {
    await fs.mkdir(exportPath, { recursive: true });
    await fs.mkdir(assetsDir, { recursive: true });
    const absoluteFilePath = getFilePath(exportPath, {
      fileName,
      created_at,
      extension,
    });
    const oldAbsoluteFilePath = oldFileName
      ? getFilePath(exportPath, {
          fileName: oldFileName,
          created_at,
          extension,
        })
      : undefined;
    if (oldAbsoluteFilePath && oldAbsoluteFilePath !== absoluteFilePath) {
      mainLogger.devLog(
        `[writeAutoExportFileLogic] Renaming ${oldAbsoluteFilePath} to ${absoluteFilePath}`,
      );
      await safeRename(oldAbsoluteFilePath, absoluteFilePath);
    }
    const portableContent = await sanitizeExportString(
      content,
      assetsDir,
      imagesFolder,
    );
    let normalizedLocal = "";
    try {
      const localContent = await fs.readFile(absoluteFilePath, "utf8");
      normalizedLocal = normalizeText(localContent).trimEnd();
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") {
        // enoent gets treated as empty file
        throw err;
      }
    }
    const normalizedContent = normalizeText(portableContent).trimEnd();
    if (normalizedLocal !== normalizedContent) {
      mainLogger.devLog(
        `[writeAutoExportFileLogic] Writing new content to ${absoluteFilePath}`,
      );
      await writeAtomic(absoluteFilePath, portableContent);
    } else {
      mainLogger.devLog(
        "[writeAutoExportFileLogic] No changes detected. Skipping write.",
      );
    }
  } catch (error: unknown) {
    mainLogger.appError(
      `[writeAutoExportFileLogic]: Failed to write file:`,
      error,
    );
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
}
async function writeAutoExportFile({
  created_at,
  fileName,
  markdown,
  targetDir,
  oldFileName,
}: AutoExportWritePayload) {
  const writePayload = {
    created_at,
    fileName,
    oldFileName,
    content: markdown,
    extension: "md",
  };
  const validatedFileData = validation(
    WriteAutoExportRequestSchema,
    writePayload,
  );
  try {
    await writeAutoExportFileLogic(targetDir, {
      ...validatedFileData,
      oldFileName,
    });
  } catch (error) {
    mainLogger.appError("[writeAutoExportFile]: Failed to write file:", error);
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
}

async function deleteAutoExportFileLogic(
  targetDir: string,
  payload: DeleteAutoExportRequest,
) {
  const exportPath = resolveAutoExportPath(targetDir);
  const absoluteFilePath = getFilePath(exportPath, payload);
  await fs.access(absoluteFilePath, constants.F_OK);
  await shell.trashItem(absoluteFilePath);
}

async function deleteAutoExportFile(
  targetDir: string,
  oldNotes: Expand<Pick<Readonly<Note>, "created_at" | "title">>[],
) {
  await processWithLimit(oldNotes, CONCURRENCY_DELETE, async (note) => {
    const validatedFileData = validation(DeleteAutoExportRequestSchema, {
      created_at: note.created_at,
      fileName: note.title,
      extension: "md" as const,
    });
    try {
      await deleteAutoExportFileLogic(targetDir, validatedFileData);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return;
      }
      mainLogger.appError(
        "[deleteAutoExportFile]: Failed to delete file:",
        error,
      );
      throw new AppBackendError(AppErrorCode.FileWriteError);
    }
  });
}

export {
  deleteAutoExportFile,
  getFilePath,
  isAutoExport,
  normalizeText,
  resolveAutoExportPath,
  writeAutoExportFile,
};
