import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { CONCURRENCY_IMAGE } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { processWithLimit } from "@shared/limiter";
import type { ImagePayload } from "@shared/schemas/image-schema";
import { createHash } from "crypto";
import { app } from "electron";
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
    CONCURRENCY_IMAGE,
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

export { handleImageWriteMany };
