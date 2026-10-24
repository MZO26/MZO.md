import { processWithLimit } from "@electron/concurrent";
import db from "@electron/db/database";
import { mainLogger } from "@electron/handler/permission-handler";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";

const MAX_BACKUPS = 5;

async function shouldRunBackup(dbBackupsDir: string) {
  const backups = await getSortedBackups(dbBackupsDir);
  if (backups.length === 0) return true;
  const newest = backups[0];
  if (!newest) return true;
  try {
    const stat = await fs.stat(path.join(dbBackupsDir, newest));
    const lastBackupDay = new Date(stat.mtimeMs).toDateString();
    const today = new Date().toDateString();
    return lastBackupDay !== today;
  } catch {
    return true;
  }
}

async function getSortedBackups(dbBackupsDir: string) {
  const entries = await fs
    .readdir(dbBackupsDir, { withFileTypes: true })
    .catch(() => []);
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith("backup-") &&
        entry.name.endsWith(".sqlite"),
    )
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));
}

function initBackupScheduler(backupRootDir: string) {
  const dbBackupsDir = path.join(backupRootDir, "db-backups");
  void (async () => {
    const entries = await fs
      .readdir(dbBackupsDir, { withFileTypes: true })
      .catch(() => []);
    const tempFiles = entries.filter(
      (e) => e.isFile() && e.name.endsWith(".tmp"),
    );
    await processWithLimit(tempFiles, 5, async (file) => {
      await fs
        .rm(path.join(dbBackupsDir, file.name), { force: true })
        .catch(() => {});
    });
  })().catch((error) => {
    mainLogger.appError("Failed to clean leftover temp files", error);
  });
  async function checkAndBackup() {
    try {
      if (await shouldRunBackup(dbBackupsDir)) {
        await runFolderBackup(backupRootDir);
        const allBackups = await getSortedBackups(dbBackupsDir);
        const toDelete = allBackups.slice(MAX_BACKUPS);
        await processWithLimit(toDelete, 5, async (file) => {
          await fs
            .rm(path.join(dbBackupsDir, file), { force: true })
            .catch(() => {});
        });
      }
    } catch (error) {
      mainLogger.appError(
        "[BackupScheduler]: Failed to run scheduled backup",
        error,
      );
    }
  }
  setTimeout(checkAndBackup, 10_000);
  setInterval(checkAndBackup, 60 * 60 * 1000);
}

async function runFolderBackup(backupRootDir: string) {
  const userData = app.getPath("userData");
  const sourceImagesDir = path.join(userData, "Images");
  const dbBackupsDir = path.join(backupRootDir, "db-backups");
  const backupImagesDir = path.join(backupRootDir, "images");
  await fs.mkdir(dbBackupsDir, { recursive: true });
  await fs.mkdir(backupImagesDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dbBackupPath = path.join(dbBackupsDir, `backup-${timestamp}.sqlite`);
  const tempPath = `${dbBackupPath}.${crypto.randomUUID()}.tmp`;
  try {
    await db.backupDb(tempPath);
    await fs.rename(tempPath, dbBackupPath);
    mainLogger.devLog(`Saved automatic sqlite backup on ${dbBackupPath}`);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
  await fs
    .cp(sourceImagesDir, backupImagesDir, {
      recursive: true,
      force: false,
      errorOnExist: false,
    })
    .catch(() => {});
}

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

export { initBackupScheduler, restoreFromBackupPath, runFolderBackup };
