import { sanitizeExportString } from "@electron/fs/fs-assets";
import { writeAtomic } from "@electron/fs/fs-atomic-write";
import { validation } from "@shared/ipc-helpers";
import { processWithLimit } from "@shared/limiter";
import { FileNameSchema } from "@shared/schemas/export-schema";
import type { ExportedContent, ExportResult } from "@shared/types";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";

async function singleExport(filePath: string, data: string) {
  const absoluteTargetFolder = path.dirname(filePath);
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "editor-images");
  const portableContent = sanitizeExportString(
    data,
    absoluteTargetFolder,
    imagesFolder,
  );
  await writeAtomic(filePath, portableContent);
}

async function batchExport(
  folder: string,
  payload: ExportedContent[],
): Promise<ExportResult[]> {
  await fs.mkdir(folder, { recursive: true });
  const absoluteTargetFolder = path.resolve(folder);
  const exported = await processWithLimit(
    payload,
    50,
    async (item: ExportedContent) => {
      const fileName = `${validation(FileNameSchema, item.fileName)}_${item.id.slice(0, 6)}.${item.extension}`;
      const absoluteFilePath = path.resolve(absoluteTargetFolder, fileName);
      const relative = path.relative(absoluteTargetFolder, absoluteFilePath);
      const isOutside = relative.startsWith("..") || path.isAbsolute(relative);
      if (isOutside) {
        return null;
      }
      const content = item.content;
      const userDataPath = app.getPath("userData");
      const imagesFolder = path.join(userDataPath, "editor-images");
      const portableContent = sanitizeExportString(
        content,
        absoluteTargetFolder,
        imagesFolder,
      );
      await writeAtomic(absoluteFilePath, portableContent);
      return {
        id: item.id,
        filePath: absoluteFilePath,
      };
    },
  );
  return exported.filter((item): item is ExportResult => item !== null);
}

export { batchExport, singleExport };
