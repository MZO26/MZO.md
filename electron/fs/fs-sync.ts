import {
  normalizeText,
  resolveAutoExportPath,
} from "@electron/fs/fs-auto-export";
import { getFilePath } from "@electron/fs/fs-helpers";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { SYNC_BUFFER } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import type { AutoExportWritePayload, Note } from "@shared/schemas/note-schema";
import type { SyncResult } from "@shared/types";
import fs from "fs/promises";

async function checkSyncState(
  targetDir: string,
  payload: AutoExportWritePayload & Pick<Note, "updated_at">,
): Promise<SyncResult> {
  const autoExportPath = resolveAutoExportPath(targetDir);
  const absoluteFilePath = getFilePath(autoExportPath, {
    fileName: payload.fileName,
    created_at: payload.created_at,
    extension: "md",
  });
  let markdown: string | null = null;
  try {
    const fsStat = await fs.stat(absoluteFilePath);
    if (!fsStat) {
      console.log("MISSING");
      return { status: "MISSING" };
    }
    const dbUpdatedAt = new Date(payload.updated_at).getTime();
    if (fsStat.mtimeMs <= dbUpdatedAt + SYNC_BUFFER) {
      console.log("UNCHANGED");
      return { status: "UNCHANGED" };
    }
    markdown = await fs.readFile(absoluteFilePath, "utf-8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      console.log(`[checkSyncState] MISSING: ${payload.fileName}`);
      return { status: "MISSING" };
    }
    console.error(
      `[checkSyncState] File access error for ${payload.fileName}:`,
      err.message,
    );
    throw new AppBackendError(AppErrorCode.InvalidData);
  }
  const normalizedLocal = normalizeText(markdown).trimEnd();
  const normalizedDB = normalizeText(payload.markdown).trimEnd();
  if (normalizedLocal === normalizedDB) {
    console.log("UNCHANGED");
    return { status: "UNCHANGED" };
  }
  console.log("MODIFIED");
  return {
    status: "MODIFIED",
    markdown,
    dbContent: payload.markdown,
  };
}

export { checkSyncState };
