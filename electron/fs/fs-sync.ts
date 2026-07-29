import {
  normalizeText,
  resolveAutoExportPath,
} from "@electron/fs/fs-auto-export";
import { getFilePath } from "@electron/fs/fs-helpers";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  appError,
  devLog,
  MAX_BYTES_FILE,
  SYNC_BUFFER,
} from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import type { AutoExportWritePayload, Note } from "@shared/schemas/note-schema";
import type { SyncResult } from "@shared/schemas/request-schema";
import type { Expand } from "@shared/types";
import fs from "fs/promises";

async function checkSyncState(
  targetDir: string,
  payload: Expand<AutoExportWritePayload & Pick<Note, "updated_at">>,
): Promise<SyncResult> {
  const autoExportPath = resolveAutoExportPath(targetDir);
  const absoluteFilePath = getFilePath(autoExportPath, {
    fileName: payload.fileName,
    created_at: payload.created_at,
    extension: "md",
  });
  let markdown: string | null = null;
  try {
    await fs.mkdir(autoExportPath, { recursive: true });
    const fsStat = await fs.stat(absoluteFilePath);
    if (!fsStat) {
      devLog("MISSING");
      return { status: "MISSING" };
    }
    if (fsStat.size > MAX_BYTES_FILE) {
      devLog(`[checkSyncState]: File size too big`);
      throw new AppBackendError(AppErrorCode.CancelledOperation);
    }
    const dbUpdatedAt = new Date(payload.updated_at).getTime();
    if (fsStat.mtimeMs <= dbUpdatedAt + SYNC_BUFFER) {
      devLog("UNCHANGED");
      return { status: "UNCHANGED" };
    }
    markdown = await fs.readFile(absoluteFilePath, "utf-8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      devLog(`[checkSyncState] MISSING: ${payload.fileName}`);
      return { status: "MISSING" };
    }
    appError(
      `[checkSyncState]: File access error for ${payload.fileName}:`,
      err.message,
    );
    throw new AppBackendError(AppErrorCode.InvalidData);
  }
  const normalizedLocal = normalizeText(markdown).trimEnd();
  const normalizedDB = normalizeText(payload.markdown).trimEnd();
  if (normalizedLocal === normalizedDB) {
    devLog("UNCHANGED");
    return { status: "UNCHANGED" };
  }
  devLog("MODIFIED");
  return {
    status: "MODIFIED",
    markdown,
    appContent: payload.markdown,
  };
}

export { checkSyncState };
