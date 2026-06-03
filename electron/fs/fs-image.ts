import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { AppErrorCode } from "@shared/errors";
import type { ImagePayload } from "@shared/schemas/image-schema";
import { createHash } from "crypto";
import { app } from "electron";
import fs from "node:fs";
import path from "path";

async function handleImageWrite(validatedData: ImagePayload) {
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
  try {
    fs.writeFileSync(filePath, imageBuffer, { flag: "wx" });
  } catch (error) {
    console.log("Image error:", error);
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "EEXIST"
    ) {
      return {
        imageSrc: `appimg:///${fileName}`,
      };
    } else {
      throw new AppBackendError(AppErrorCode.FileWriteError);
    }
  }
  return { imageSrc: `appimg:///${fileName}` };
}

export { handleImageWrite };
