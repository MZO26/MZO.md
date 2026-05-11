import { createPDFCanvas } from "@electron/handler/export-handler";
import { safeResponse } from "@electron/ipc/ipc-validation";
import { store } from "@electron/store";
import { createHiddenPdfWindow } from "@electron/win";
import { validateExport, validateFiles } from "@shared/validation";
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
    store.set("mirror-path", selectedPath);
    return selectedPath;
  });

  ipcMain.handle("note:import", (e) => {
    return safeResponse(e, async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: "Import note",
        properties: ["openFile"],
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
      if (canceled || !filePath) {
        throw new Error("CANCELLED_OPERATION");
      }
      const content = await fs.readFile(filePath, "utf8");
      const extension = path.extname(filePath).slice(1).toLowerCase();
      const fileName = path.basename(filePath, path.extname(filePath));
      const validatedData = validateFiles({
        extension,
        content,
        fileName,
      });

      return validatedData;
    });
  });

  ipcMain.handle("note:export", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      const validatedData = validateExport(payload);
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
      // if string -> content doesn't get changed, but if it's still json editor doc it gets stringified
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
