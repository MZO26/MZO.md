import { processWithLimit } from "@electron/fs/fs-limiter";
import { batchExport } from "@electron/fs/fs-write-batch";
import { createPDFCanvas } from "@electron/handler/pdf-handler";
import { safeResponse } from "@electron/ipc/ipc-validation";
import { createHiddenPdfWindow } from "@electron/win";
import {
  ExportManyRequestSchema,
  ExportRequestSchema,
  ImportRequestSchema,
} from "@shared/schemas/export-schema";
import { validation } from "@shared/validation";
import {
  dialog,
  ipcMain,
  type BrowserWindow,
  type PrintToPDFOptions,
} from "electron";
import fs from "fs/promises";
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
      const filePath = filePaths[0];
      if (canceled || !filePath || filePath.length === 0) {
        throw new Error("CANCELLED_OPERATION");
      }
      const imported = await processWithLimit(
        filePaths,
        50,
        async (filePath) => {
          try {
            const content = await fs.readFile(filePath, "utf8");
            const extension = path.extname(filePath).slice(1).toLowerCase();
            const fileName = path.basename(filePath, path.extname(filePath));
            return validation(ImportRequestSchema, {
              extension,
              fileName,
              content,
            });
          } catch (error) {
            console.error(`Failed to read/validate file: ${filePath}`, error);
            return null;
          }
        },
      );
      const validNotes = imported.filter((note) => note !== null);
      return validNotes;
    });
  });

  ipcMain.handle("note:export-many", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      const validatedData = validation(ExportManyRequestSchema, payload);
      if (!validatedData) {
        throw new Error("CANCELLED_OPERATION");
      }
      const { extension } = validatedData;
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Select Folder for Export",
        buttonLabel: "Export Here",
        properties: ["openDirectory", "createDirectory", "promptToCreate"],
      });

      const selectedFolder = filePaths[0];
      if (canceled || !selectedFolder) {
        throw new Error("CANCELLED_OPERATION");
      }
      await batchExport(selectedFolder, extension);
      return selectedFolder;
    });
  });

  ipcMain.handle("note:export", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      const validatedData = validation(ExportRequestSchema, payload);
      if (!validatedData) {
        throw new Error("CANCELLED_OPERATION");
      }
      const { content, extension, fileName } = validatedData;
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export Note",
        defaultPath: `${fileName}.${extension}`,
        filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
      });
      if (canceled || !filePath) {
        throw new Error("CANCELLED_OPERATION");
      }
      const data =
        typeof content === "string"
          ? content
          : JSON.stringify(content, null, 2); // null as "replacer argument" means nothing gets filtered or changed and 2 is the "space argument" to add line breaks and indent nested objects in json
      if (extension === "pdf") {
        // sanitize html for it to be safe to be put in rendering window
        const hiddenWin = createHiddenPdfWindow();
        console.log(
          `[PDF-Export] Created hidden window with ID: ${hiddenWin.id}`,
        );
        const pdfOptions: PrintToPDFOptions = {
          pageSize: "A4",
          printBackground: true,
          landscape: false,
        };
        const htmlString = createPDFCanvas(data);
        try {
          console.log("[PDF-Export]: Loading HTML into canvas.");
          // converts htmlString into bytes using utf8 encoding (Buffer is Node.js's raw byte array). toString(base64) then takes those bytes and encodes them as base64 which only allows A-Z a-z 0-9 + / = chars.
          const encoded = Buffer.from(htmlString, "utf8").toString("base64");
          // data:text/html tells chrome parse as html and base64 tells chrome to decode before parsing with the exact html bytes. Base64 is required to load the css correctly because chrome expects URL's to have URL-encoded content.
          await hiddenWin.loadURL(`data:text/html;base64,${encoded}`);
          const pdfBuffer = await hiddenWin.webContents.printToPDF(pdfOptions);
          await fs.writeFile(filePath, pdfBuffer);
          console.log("[PDF-Export]: Successful.");
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
      await fs.writeFile(filePath, data, "utf-8");
      return filePath;
    });
  });
}

export { registerFileIpc };
