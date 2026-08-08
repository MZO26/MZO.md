import {
  normalizeText,
  resolveAutoExportPath,
} from "@electron/fs/fs-auto-export";
import { getFilePath } from "@electron/fs/fs-helpers";
import { mainLogger } from "@electron/handler/permission-handler";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { AppErrorCode } from "@shared/errors";
import type { AutoExportWritePayload, Note } from "@shared/schemas/note-schema";
import type { SyncResult } from "@shared/schemas/request-schema";
import { MAX_BYTES_FILE } from "@shared/shared-constants";
import fs from "fs/promises";

const SYNC_BUFFER = 2000; // 2 seconds to account for DB timestamp differences or OS write delays

async function checkSyncState(
  targetDir: string,
  payload: AutoExportWritePayload & Pick<Readonly<Note>, "updated_at">,
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
      mainLogger.devLog("MISSING");
      return { status: "MISSING" };
    }
    if (fsStat.size > MAX_BYTES_FILE) {
      mainLogger.devLog(`[checkSyncState]: File size too big`);
      throw new AppBackendError(AppErrorCode.CancelledOperation);
    }
    const dbUpdatedAt = new Date(payload.updated_at).getTime();
    if (Number.isNaN(dbUpdatedAt))
      throw new AppBackendError(AppErrorCode.InvalidData);
    if (fsStat.mtimeMs <= dbUpdatedAt + SYNC_BUFFER) {
      mainLogger.devLog("UNCHANGED");
      return { status: "UNCHANGED" };
    }
    markdown = await fs.readFile(absoluteFilePath, "utf-8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      mainLogger.devLog(`[checkSyncState] MISSING: ${payload.fileName}`);
      return { status: "MISSING" };
    }
    mainLogger.appError(
      `[checkSyncState]: File access error for ${payload.fileName}:`,
      err.message,
    );
    throw new AppBackendError(AppErrorCode.InvalidData);
  }
  const normalizedLocal = normalizeText(markdown).trimEnd();
  const normalizedDB = normalizeText(payload.markdown).trimEnd();
  if (normalizedLocal === normalizedDB) {
    mainLogger.devLog("UNCHANGED");
    return { status: "UNCHANGED" };
  }
  mainLogger.devLog("MODIFIED");
  return {
    status: "MODIFIED",
    markdown,
    appContent: payload.markdown,
  };
}

export { checkSyncState };
