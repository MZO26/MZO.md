import { sanitizeExportString } from "@electron/fs/fs-assets";
import { writeAtomic } from "@electron/fs/fs-atomic-write";
import { batchExport } from "@electron/fs/fs-export";
import { batchPDFExport } from "@electron/fs/fs-export-pdf";
import { batchImport } from "@electron/fs/fs-import";
import { exportPdfNote } from "@electron/fs/fs-pdf";
import { loadPDFAssets } from "@electron/handler/pdf-handler";
import { safeResponse } from "@electron/ipc/ipc-validation";
import { createHiddenPdfWindow } from "@electron/win";
import { validation } from "@shared/ipc-helpers";
import {
  ExportManyRequestSchema,
  ExportRequestSchema,
  FileNameSchema,
} from "@shared/schemas/export-schema";
import { app, dialog, ipcMain, type BrowserWindow } from "electron";
import path from "path";

function registerFileIpc(win: BrowserWindow) {
  ipcMain.handle("select-folder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }
    const selectedPath = filePaths[0];
    return selectedPath;
  });

  ipcMain.handle("note:import", (e) => {
    return safeResponse(e, async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: "Import note",
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "Supported files",
            extensions: ["md", "txt", "html", "json"],
          },
          { name: "Markdown", extensions: ["md"] },
          { name: "Text", extensions: ["txt"] },
          { name: "HTML", extensions: ["html"] },
          { name: "JSON", extensions: ["json"] },
        ],
      });
      const hasFiles = filePaths?.length > 0;
      if (canceled || !hasFiles) {
        throw new Error("CANCELLED_OPERATION");
      }
      const result = await batchImport(filePaths);
      return result;
    });
  });

  ipcMain.handle("note:export-many", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      const validatedData = validation(ExportManyRequestSchema, payload);
      if (!validatedData) {
        throw new Error("CANCELLED_OPERATION");
      }
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Select Folder for Export",
        buttonLabel: "Export Here",
        properties: ["openDirectory", "createDirectory", "promptToCreate"],
      });
      const selectedFolder = filePaths[0];
      if (canceled || !selectedFolder) {
        throw new Error("CANCELLED_OPERATION");
      }
      const hasPdf = validatedData.some(
        (item) => "extension" in item && item.extension === "pdf",
      );
      if (hasPdf) {
        const result = await batchPDFExport(selectedFolder, validatedData);
        return result;
      }
      const result = await batchExport(selectedFolder, validatedData);
      return result;
    });
  });

  ipcMain.handle("note:export", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      const validatedData = validation(ExportRequestSchema, payload);
      if (!validatedData) {
        throw new Error("CANCELLED_OPERATION");
      }
      const { id, content, extension, fileName } = validatedData;
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export Note",
        defaultPath: `${validation(FileNameSchema, fileName)}_${id.slice(0, 6)}.${extension}`,
        filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
      });
      if (canceled || !filePath) {
        throw new Error("CANCELLED_OPERATION");
      }
      const absoluteTargetFolder = path.dirname(filePath);
      const data =
        typeof content === "string"
          ? content
          : JSON.stringify(content, null, 2);
      const userDataPath = app.getPath("userData");
      const imagesFolder = path.join(userDataPath, "editor-images");
      const portableContent = sanitizeExportString(
        data,
        absoluteTargetFolder,
        imagesFolder,
      );
      // null as "replacer argument" means nothing gets filtered or changed and 2 is the "space argument" to add line breaks and indent nested objects in json
      if (extension === "pdf") {
        // sanitize html for it to be safe to be put in rendering window
        const hiddenWin = createHiddenPdfWindow();
        console.log(
          `[PDF-Export] Created hidden window with ID: ${hiddenWin.id}`,
        );
        const assets = loadPDFAssets();
        try {
          await exportPdfNote({ win: hiddenWin, filePath, html: data, assets });
          return filePath;
        } catch (error) {
          console.error("[PDF-Export]: Error", error);
        } finally {
          if (hiddenWin && !hiddenWin.isDestroyed()) {
            hiddenWin.destroy();
            console.log(
              `[PDF-Export] Window ID ${hiddenWin.id} destroyed`,
              hiddenWin.isDestroyed(),
            );
          }
        }
      }
      await writeAtomic(filePath, portableContent);
      return filePath;
    });
  });
}

export { registerFileIpc };
