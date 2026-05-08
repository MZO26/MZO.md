import { safeResponse } from "@electron/ipc/ipc-validation";
import { validateExport } from "@shared/validation";
import { dialog, ipcMain, type BrowserWindow } from "electron";
import fs from "fs/promises";

function registerExportIpc(win: BrowserWindow) {
  ipcMain.handle("notes:export", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      const validatedData = validateExport(payload);
      if (!validatedData) {
        throw new Error("CANCELLED_OPERATION");
      }
      const { content, extension, defaultName } = validatedData;
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export Note",
        defaultPath: `${defaultName}.${extension}`,
        filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
      });
      if (canceled || !filePath) {
        throw new Error("CANCELLED_OPERATION");
      }
      await fs.writeFile(filePath, content, "utf-8");
      return filePath;
    });
  });
}

export { registerExportIpc };
