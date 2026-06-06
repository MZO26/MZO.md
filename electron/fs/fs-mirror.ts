import { sanitizeExportString } from "@electron/fs/fs-assets";
import { writeAtomic } from "@electron/fs/fs-atomic-write";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import {
  DeleteMirrorRequestSchema,
  FileNameSchema,
  WriteMirrorRequestSchema,
  type DeleteMirrorRequest,
  type SyncRequest,
  type WriteMirrorRequest,
} from "@shared/schemas/export-schema";
import type {
  MirroredNoteWritePayload,
  Note,
} from "@shared/schemas/note-schema";
import type { ExportedContent, FileContent, SyncResult } from "@shared/types";
import console from "console";
import { app, shell } from "electron";
import fs, { access, constants, mkdir, readFile, stat } from "fs/promises";
import path from "path";

function getFilePath(
  targetDirectory: string,
  payload: ExportedContent | FileContent | DeleteMirrorRequest,
) {
  const extension = payload.extension ?? "md";
  const idSuffix = `_${payload.id}.${extension}`;
  const safeTitle = validation(FileNameSchema, payload.fileName);
  const newFileName = `${safeTitle}${idSuffix}`;
  const absoluteFilePath = path.resolve(targetDirectory, newFileName);
  // security check
  const relative = path.relative(targetDirectory, absoluteFilePath);
  const isOutside = relative.startsWith("..") || path.isAbsolute(relative);
  if (isOutside) {
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
  return { absoluteFilePath, idSuffix };
}

function resolveMirrorPath(targetDir: string) {
  const normalized = path.resolve(targetDir);
  const baseName = path.basename(normalized).toLowerCase();

  return baseName === "mzo notes"
    ? normalized
    : path.join(normalized, "MZO Notes");
}

function normalizeMarkdown(content: string | null | undefined) {
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

async function checkSyncState(
  targetDir: string,
  payload: SyncRequest,
): Promise<SyncResult> {
  const mirrorPath = resolveMirrorPath(targetDir);
  const { absoluteFilePath } = getFilePath(mirrorPath, {
    fileName: payload.fileName,
    id: payload.id,
    extension: "md",
  });
  let localContent: string | null = null;
  try {
    const fsStat = await stat(absoluteFilePath).catch(() => null);
    if (!fsStat) return { type: "MISSING_RESOLVED" };
    const dbUpdatedAt = new Date(payload.updated_at).getTime();
    if (fsStat.mtimeMs <= dbUpdatedAt) return { type: "IN_SYNC" };
    localContent = await readFile(absoluteFilePath, "utf-8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[checkSyncState]: Error checking file:", error);
      throw new AppBackendError(AppErrorCode.InvalidData);
    }
    return { type: "MISSING_RESOLVED" };
  }
  const normalizedLocal = normalizeMarkdown(localContent).trimEnd();
  const normalizedDB = normalizeMarkdown(payload.content).trimEnd();
  if (normalizedLocal === normalizedDB) {
    return { type: "IN_SYNC" };
  }
  return { type: "OUT_OF_SYNC", localContent, dbContent: payload.content };
}

async function writeMirroredNoteLogic(
  targetDir: string,
  payload: WriteMirrorRequest,
) {
  const { id, fileName, oldFileName, extension } = payload;
  const mirrorPath = resolveMirrorPath(targetDir);
  await mkdir(mirrorPath, { recursive: true });
  const { absoluteFilePath } = getFilePath(mirrorPath, {
    fileName,
    id,
    extension,
  });
  const oldAbsoluteFilePath = oldFileName
    ? getFilePath(targetDir, { fileName: oldFileName, id, extension })
        .absoluteFilePath
    : undefined;
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  const portableContent = sanitizeExportString(
    payload.content,
    mirrorPath,
    imagesFolder,
  );
  try {
    // check for rename: if oldFileName exists and is different from new file name, attempt to rename the file before writing new content. This is to avoid duplicate files when a note is renamed.
    if (oldAbsoluteFilePath && oldAbsoluteFilePath !== absoluteFilePath) {
      await fs.rename(oldAbsoluteFilePath, absoluteFilePath);
    }
  } catch (error: unknown) {
    // if enonent, it means the file doesn't exist and a new one can be created
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(
        "[writeMirroredNoteLogic]: Safe rename lookup failed",
        error,
      );
    }
  }
  const existing = await readFile(absoluteFilePath, "utf8").catch(() => null);
  if (existing !== portableContent) {
    await writeAtomic(absoluteFilePath, portableContent);
  }
}

async function writeMirroredNote({
  id,
  fileName,
  markdown,
  targetDir,
  oldFileName,
}: MirroredNoteWritePayload) {
  const writePayload = {
    id,
    fileName,
    oldFileName,
    content: markdown,
    extension: "md",
  };
  const validatedFileData = validation(WriteMirrorRequestSchema, writePayload);
  const validatedOldFileName = validatedFileData.oldFileName
    ? validation(FileNameSchema, validatedFileData.oldFileName)
    : undefined;
  console.log("[writeMirroredNote]: Attempting to sync note:", {
    id: validatedFileData.id,
    fileName: validatedFileData.fileName,
    oldFileName: validatedOldFileName,
  });
  try {
    await writeMirroredNoteLogic(targetDir, {
      ...validatedFileData,
      oldFileName: validatedOldFileName,
    });
  } catch (error) {
    console.error("[writeMirroredNote]: Failed to sync note on update:", error);
  }
}

async function deleteMirroredNoteLogic(
  targetDir: string,
  payload: DeleteMirrorRequest,
) {
  const mirrorPath = resolveMirrorPath(targetDir);
  const { absoluteFilePath } = getFilePath(mirrorPath, payload);
  await access(absoluteFilePath, constants.F_OK);
  await shell.trashItem(absoluteFilePath);
}

async function deleteMirroredNote(
  targetDir: string,
  id: Note["id"],
  oldTitle: Note["title"],
) {
  const deletePayload = {
    id,
    fileName: oldTitle,
    extension: "md",
  };
  const validatedFileData = validation(
    DeleteMirrorRequestSchema,
    deletePayload,
  );
  try {
    await deleteMirroredNoteLogic(targetDir, validatedFileData);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    console.error("[deleteMirroredNote]: Failed to sync note deletion:", error);
  }
}

export { checkSyncState, deleteMirroredNote, getFilePath, writeMirroredNote };
