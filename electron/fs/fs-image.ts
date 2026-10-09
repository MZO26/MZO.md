import { processWithLimit } from "@electron/concurrent";
import { mainLogger } from "@electron/handler/permission-handler";
import { AppBackendError, AppErrorCode } from "@shared/errors";
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

async function removeUnusedImages(hashes: string[]) {
  if (!hashes || hashes.length === 0) return;
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  await fs.mkdir(imagesFolder, { recursive: true });
  await processWithLimit(hashes, 5, async (file) => {
    const filePath = path.join(imagesFolder, file);
    try {
      await shell.trashItem(filePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") return;
      mainLogger.appError(`Failed to delete image: ${file}`, error);
    }
  });
  mainLogger.devLog(
    `Cleaned up ${hashes.length} ${hashes.length > 1 ? "images" : "image"}`,
  );
}

export { handleImageWriteMany, removeUnusedImages };
