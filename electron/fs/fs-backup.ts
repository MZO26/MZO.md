import db from "@electron/db/database";
import { mainLogger } from "@electron/handler/permission-handler";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { AppErrorCode } from "@shared/errors";
import { app } from "electron";
import fs from "fs/promises";

async function restoreFromBackupPath(backupPath: string) {
  const stat = await fs.stat(backupPath);
  // sqlite header is exactly 100 bytes long. If file is smaller than that it isn't a valid sqlite db
  if (!stat.isFile() || stat.size < 100) {
    throw new AppBackendError(AppErrorCode.InvalidData);
  }
  const dbPath = db.pathDb();
  const tmpPath = `${dbPath}.${crypto.randomUUID()}.restore-tmp`;
  try {
    db.close();
    await fs.copyFile(backupPath, tmpPath);
    await fs.rename(tmpPath, dbPath);
    const fileHandle = await fs.open(dbPath, "r+");
    await fileHandle.sync();
    await fileHandle.close();
    await fs.rm(`${dbPath}-wal`, { force: true });
    await fs.rm(`${dbPath}-shm`, { force: true });
    // doesn't work in dev mode since vite connection gets lost, has to be packaged
    setImmediate(() => {
      app.relaunch();
      app.exit(0);
    });
  } catch (error) {
    await fs.rm(tmpPath, { force: true }).catch((error) => {
      mainLogger.appError("[DB-Restore]: Failed to remove tmpPath", error);
    });
    db.open();
    mainLogger.appError("[DB-Restore] Error during restore:", error);
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
}

export { restoreFromBackupPath };
