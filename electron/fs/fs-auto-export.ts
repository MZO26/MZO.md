import db from "@electron/db/database";
import { writeAtomic } from "@electron/fs/fs-atomic-write";
import { getFilePath, sanitizeExportString } from "@electron/fs/fs-helpers";
import { settingsService } from "@electron/handler/settings-handler";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import { processWithLimit } from "@shared/limiter";
import {
  IdSchema,
  type AutoExportWritePayload,
  type Note,
} from "@shared/schemas/note-schema";
import {
  DeleteAutoExportRequestSchema,
  WriteAutoExportRequestSchema,
  type DeleteAutoExportRequest,
  type WriteAutoExportRequest,
} from "@shared/schemas/request-schema";
import console from "console";
import { app, shell } from "electron";
import { constants } from "fs";
import fs from "fs/promises";
import path from "path";

async function isAutoExport(id: string): Promise<boolean> {
  try {
    const settings = settingsService.getSettings();
    const enabled = settings["auto_export"] ?? false;
    const targetDir = settings["auto_export_path"];
    if (!enabled || !targetDir) return false;
    const validatedData = validation(IdSchema, id);
    const notes = db.getOldNotes([validatedData]);
    if (!Array.isArray(notes) || !notes[0]) return false;
    const note = notes[0];
    const exportPath = resolveAutoExportPath(targetDir);
    const absoluteFilePath = getFilePath(exportPath, {
      created_at: note.created_at,
      fileName: note.title,
      extension: "md",
    });
    if (!absoluteFilePath) return false;
    try {
      await fs.access(absoluteFilePath, fs.constants.F_OK);
      console.log("[isAutoExport]: This note is on the file system.");
      return true;
    } catch (fsError) {
      const err = fsError as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        console.log("[isAutoExport]: This note is not on the file system yet.");
        return false;
      }
      throw fsError;
    }
  } catch (error) {
    console.error(
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
      console.error("[writeAutoExportFileLogic -> safeRename]: File not found");
      return;
    } else if (err.code === "EXDEV") {
      // for cross-partition moves
      try {
        await fs.copyFile(src, dest);
        await fs.unlink(src);
      } catch (error) {
        console.error(
          "[writeAutoExportFileLogic -> safeRename]: EXDEV  fallback failed",
          error,
        );
        throw new AppBackendError(AppErrorCode.FileWriteError);
      }
    } else {
      console.error(
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
  await fs.mkdir(exportPath, { recursive: true }).catch((error: unknown) => {
    console.error(
      "[writeAutoExportFileLogic]: Failed to create directory:",
      error,
    );
    throw new AppBackendError(AppErrorCode.FileWriteError);
  });
  const assetsDir = path.join(exportPath, "assets");
  await fs.mkdir(assetsDir, { recursive: true }).catch((error: unknown) => {
    console.error(
      "[writeAutoExportFileLogic]: Failed to create assets directory:",
      error,
    );
    throw new AppBackendError(AppErrorCode.FileWriteError);
  });
  const absoluteFilePath = getFilePath(exportPath, {
    fileName,
    created_at,
    extension,
  });
  const oldAbsoluteFilePath = oldFileName
    ? getFilePath(exportPath, { fileName: oldFileName, created_at, extension })
    : undefined;
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  // check for rename: if oldFileName exists and is different from new file name, attempt to rename the file before writing new content. This is to avoid duplicate files when a note is renamed.
  if (oldAbsoluteFilePath && oldAbsoluteFilePath !== absoluteFilePath) {
    console.log("New rename.");
    await safeRename(oldAbsoluteFilePath, absoluteFilePath);
  } else console.log("No rename needed.");
  const portableContent = await sanitizeExportString(
    content,
    assetsDir,
    imagesFolder,
  );
  const localContent = await fs
    .readFile(absoluteFilePath, "utf8")
    .catch(() => "");
  const normalizedLocal = normalizeText(localContent).trimEnd();
  const normalizedContent = normalizeText(portableContent).trimEnd();
  if (normalizedLocal !== normalizedContent) {
    console.log("New write.");
    await writeAtomic(absoluteFilePath, portableContent);
  } else console.log("No write needed.");
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
  console.log("[writeAutoExportFile]: Looking at file:", {
    created_at: validatedFileData.created_at,
    fileName: validatedFileData.fileName,
    oldFileName,
  });
  try {
    await writeAutoExportFileLogic(targetDir, {
      ...validatedFileData,
      oldFileName,
    });
  } catch (error) {
    console.error("[writeAutoExportFile]: Failed to write file:", error);
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
  oldNotes: Pick<Note, "created_at" | "title">[],
) {
  await processWithLimit(oldNotes, 20, async (note) => {
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
      console.error("[deleteAutoExportFile]: Failed to delete file:", error);
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
