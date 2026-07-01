import db from "@electron/db/database";
import { writeAtomic } from "@electron/fs/fs-atomic-write";
import { getFilePath, sanitizeExportString } from "@electron/fs/fs-helpers";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { store } from "@electron/store";
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
import { readFileSync } from "fs";
import fs, { access, constants, mkdir, readFile } from "fs/promises";
import path from "path";

async function isAutoExport(id: string) {
  const validatedData = validation(IdSchema, id);
  const note = db.getOldNotes([validatedData]);
  if (!note[0]) return false;
  const enabled = store.get("auto-export") ?? false;
  if (!enabled) return false;
  const targetDir = (enabled && store.get("auto-export-path")) ?? null;
  if (!targetDir) return false;
  const exportPath = resolveAutoExportPath(targetDir);
  const absoluteFilePath = getFilePath(exportPath, {
    created_at: note[0]?.created_at,
    fileName: note[0]?.title,
    extension: "md",
  });
  try {
    if (!!absoluteFilePath && readFileSync(absoluteFilePath)) {
      console.log("[isAutoExport]: This note is on file system.");
      return true;
    }
    console.log("[isAutoExport]: This note is not on file system yet.");
    return false;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return false;
    }
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
  try {
    const src = oldAbsoluteFilePath.normalize("NFC");
    const dest = absoluteFilePath.normalize("NFC");
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
    if (err.code !== "ENOENT") {
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
  const { created_at, fileName, oldFileName, extension } = payload;
  const exportPath = resolveAutoExportPath(targetDir);
  await mkdir(exportPath, { recursive: true });
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
  const portableContent = await sanitizeExportString(
    payload.content,
    exportPath,
    imagesFolder,
  );
  // check for rename: if oldFileName exists and is different from new file name, attempt to rename the file before writing new content. This is to avoid duplicate files when a note is renamed.
  if (oldAbsoluteFilePath && oldAbsoluteFilePath !== absoluteFilePath) {
    console.log("New rename.");
    await safeRename(oldAbsoluteFilePath, absoluteFilePath);
  } else console.log("No rename needed.");
  const localContent = await readFile(absoluteFilePath, "utf8").catch(
    () => null,
  );
  const normalizedLocal = normalizeText(localContent).trimEnd();
  const normalizedContent = normalizeText(portableContent).trimEnd();
  if (normalizedLocal !== normalizedContent) {
    console.log("New write.");
    await writeAtomic(absoluteFilePath, normalizedContent);
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
  console.log("[writeNote]: Looking at file:", {
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
    console.error("[writeMirroredNote]: Failed to write file:", error);
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
}

async function deleteAutoExportFileLogic(
  targetDir: string,
  payload: DeleteAutoExportRequest,
) {
  const exportPath = resolveAutoExportPath(targetDir);
  const absoluteFilePath = getFilePath(exportPath, payload);
  await access(absoluteFilePath, constants.F_OK);
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
      console.error("[deleteFile]: Failed to delete file:", error);
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
