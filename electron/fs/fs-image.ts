import { resolveAutoExportPath } from "@electron/fs/fs-auto-export";
import { mainLogger } from "@electron/handler/permission-handler";
import { processWithLimit } from "@electron/helpers";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { resolveAutoExport } from "@electron/ipc/ipc-helpers";
import { AppErrorCode } from "@shared/errors";
import type { ImagePayload } from "@shared/schemas/image-schema";
import { createHash } from "crypto";
import { app, shell } from "electron";
import fs from "fs/promises";
import path from "path";

async function handleImageWriteMany(validatedData: ImagePayload[]) {
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  await fs.mkdir(imagesFolder, { recursive: true });
  const prepared = validatedData.map((image) => {
    const imageBuffer = Buffer.from(image.imageData);
    const hash = createHash("sha256").update(imageBuffer).digest("hex");
    const fileName = `${hash}.${image.extension}`;
    return {
      imageSrc: `appimg:///${fileName}`,
      fileName,
      filePath: path.join(imagesFolder, fileName),
      imageBuffer,
    };
  });
  const uniqueWrites = new Map<
    string,
    { filePath: string; imageBuffer: Buffer }
  >();
  for (const item of prepared) {
    if (!uniqueWrites.has(item.fileName)) {
      uniqueWrites.set(item.fileName, {
        filePath: item.filePath,
        imageBuffer: item.imageBuffer,
      });
    }
  }
  await processWithLimit(
    [...uniqueWrites.values()],
    5,
    async ({ filePath, imageBuffer }) => {
      try {
        await fs.writeFile(filePath, imageBuffer, { flag: "wx" });
      } catch (error: unknown) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== "EEXIST") {
          throw new AppBackendError(AppErrorCode.FileWriteError);
        }
      }
    },
  );
  return prepared.map((item) => item.imageSrc);
}

async function removeUnusedImages(usedImages: string[]) {
  const usedSet = new Set(usedImages);
  const foldersToClean: string[] = [];
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  try {
    await fs.mkdir(imagesFolder, { recursive: true });
    foldersToClean.push(imagesFolder);
  } catch (error) {
    mainLogger.appError("Failed to create local images folder", error);
  }
  try {
    const { targetDir } = resolveAutoExport();
    if (targetDir) {
      const exportPath = resolveAutoExportPath(targetDir);
      const exportAssetsFolder = path.join(exportPath, "assets");
      await fs.mkdir(exportAssetsFolder, { recursive: true });
      foldersToClean.push(exportAssetsFolder);
    }
  } catch (error) {
    mainLogger.devLog("Auto-export folder not available for cleanup");
  }
  for (const folder of foldersToClean) {
    try {
      const allImages = await fs.readdir(folder);
      const unused = allImages.filter((i) => !usedSet.has(i));
      if (unused.length === 0) {
        continue;
      }
      await trashImages(unused, folder);
      mainLogger.devLog(
        `Successfully cleaned up ${unused.length} ${unused.length > 1 ? "images" : "image"}`,
      );
    } catch (error) {
      mainLogger.appError(
        `Failed to process cleanup for folder: ${folder}`,
        error,
      );
    }
  }
  mainLogger.devLog("Unused images cleanup completed successfully.");
}

async function trashImages(unused: string[], imagesFolder: string) {
  await processWithLimit(unused, 5, async (file) => {
    const filePath = path.join(imagesFolder, file);
    try {
      await shell.trashItem(filePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") return;
      mainLogger.appError(`Failed to delete image: ${file}`, error);
    }
  });
}

export { handleImageWriteMany, removeUnusedImages };
