import { getSafeLocalDateString } from "@electron/fs/fs-helpers";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import {
  type ExportRequest,
  FileNameSchema,
} from "@shared/schemas/request-schema";
import { app, BrowserWindow, dialog } from "electron";
import path from "path";

async function handleImportDialog(win: BrowserWindow) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Import note",
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Supported files",
        extensions: ["md", "html", "json", "txt"],
      },
      { name: "Markdown", extensions: ["md"] },
      { name: "HTML", extensions: ["html"] },
      { name: "JSON", extensions: ["json"] },
      { name: "Text", extensions: ["txt"] },
    ],
  });
  const hasFiles = filePaths?.length > 0;
  if (canceled || !hasFiles) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  return filePaths;
}

async function handleDBBackupDialog(win: BrowserWindow) {
  const timestamp = getSafeLocalDateString(new Date());
  const defaultPath = path.join(
    app.getPath("documents"),
    `db-backup-${timestamp}.sqlite`,
  );
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Backup database",
    defaultPath,
    buttonLabel: "Save backup",
    filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }],
    properties: ["showOverwriteConfirmation"],
  });
  if (canceled || !filePath) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  return filePath;
}

async function handleDBRestoreDialog(win: BrowserWindow) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Restore database backup",
    buttonLabel: "Restore",
    filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }],
    properties: ["openFile"],
  });
  if (canceled || filePaths.length === 0) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  return filePaths[0];
}

async function handleExportDialog(win: BrowserWindow, data: ExportRequest) {
  const extension = data.extension ?? "md";
  const creationDate = new Date(data.created_at);
  const safeDate = getSafeLocalDateString(creationDate);
  const safeTitle = validation(FileNameSchema, data.fileName);
  const fileName = `${safeTitle}_${safeDate}.${extension}`;
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Export Note",
    defaultPath: fileName,
    filters: [
      { name: data.extension.toUpperCase(), extensions: [data.extension] },
    ],
  });
  if (canceled || !filePath) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  return filePath;
}

async function handleExportManyDialog(win: BrowserWindow) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Select Folder for Export",
    buttonLabel: "Export Here",
    properties: ["openDirectory", "createDirectory", "promptToCreate"],
  });
  const selectedFolder = filePaths[0];
  if (canceled || !selectedFolder) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  return selectedFolder;
}

export {
  handleDBBackupDialog,
  handleDBRestoreDialog,
  handleExportDialog,
  handleExportManyDialog,
  handleImportDialog,
};
