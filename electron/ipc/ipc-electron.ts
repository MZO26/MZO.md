import { LIMITS } from "@shared/constants";
import { validateImage, validateTheme } from "@shared/validation";
import { createHash } from "crypto";
import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs";
import path from "path";
import { checkRateLimit, safeResponse } from "./ipc-validation";
import { initTheme, getTitleBarOverlay } from "@electron/titlebar";
import type { Theme } from "@shared/schemas/store-schema";

function registerElectronIpc() {
  ipcMain.handle("platform:get", (e) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("platform:get", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      return process.platform;
    });
  });

  ipcMain.handle("set:theme", (e, theme: Theme, focus?: boolean) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("set:theme", LIMITS.WRITE_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateTheme(theme);
      const activeTheme = initTheme(validatedData);
      const windowTheme = focus
        ? getTitleBarOverlay(activeTheme, true)
        : getTitleBarOverlay(activeTheme, false);
      BrowserWindow.getAllWindows().forEach((win) => {
        win.setTitleBarOverlay?.(windowTheme.overlayOptions);
      });
      return theme;
    });
  });

  ipcMain.handle("saveImage", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("saveImage", LIMITS.WRITE_HEAVY))
        throw new Error("RATE_LIMIT");
      const validatedData = validateImage(payload);
      const userDataPath = app.getPath("userData");
      const imagesFolder = path.join(userDataPath, "editor-images");
      // Create the folder if it doesn't exist yet
      if (!fs.existsSync(imagesFolder)) {
        fs.mkdirSync(imagesFolder, { recursive: true }); // to guarantee folder exists
      }
      const imageBuffer = Buffer.from(validatedData.imageData);
      const hash = createHash("sha256").update(imageBuffer).digest("hex");
      // converts frontend ArrayBuffer to NodeJS Buffer Format so file system can understand it. Hashes image name but finds duplicates compared to uuid which always creates new id's
      const fileName = `${hash}.${validatedData.extension}`;
      const filePath = path.join(imagesFolder, fileName);
      if (fs.existsSync(filePath)) {
        console.log("Image already existing. Skipping saving process");
        return { imageSrc: `appimg:///${fileName}` };
      }
      // 4. Save the file to the hard drive
      fs.writeFileSync(filePath, imageBuffer);
      // 5. Return the local file path to Tiptap
      return {
        imageSrc: `appimg:///${fileName}`,
      };
    });
  });
}

export { registerElectronIpc };
