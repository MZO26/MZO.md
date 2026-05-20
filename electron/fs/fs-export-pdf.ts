import { processWithLimit } from "@electron/fs/fs-limiter";
import { exportPdfNote } from "@electron/fs/fs-pdf";
import { loadPDFAssets } from "@electron/handler/pdf-handler";
import { createHiddenPdfWindow } from "@electron/win";
import { validation } from "@shared/ipc-helpers";
import { FileNameSchema } from "@shared/schemas/export-schema";
import type { ExportItem } from "@shared/types";
import fs from "fs/promises";
import path from "path";

async function batchPDFExport(folder: string, payload: ExportItem[]) {
  await fs.mkdir(folder, { recursive: true });
  const absoluteTargetFolder = path.resolve(folder);
  const assets = loadPDFAssets();
  const hiddenWin = createHiddenPdfWindow();
  try {
    const exported = await processWithLimit(payload, 1, async (note) => {
      const fileName = `${validation(FileNameSchema, note.fileName)}_${note.id.slice(0, 6)}.pdf`;
      const absoluteFilePath = path.resolve(absoluteTargetFolder, fileName);
      const relative = path.relative(absoluteTargetFolder, absoluteFilePath);
      const isOutside = relative.startsWith("..") || path.isAbsolute(relative);
      if (isOutside) {
        return null;
      }
      const filePath = await exportPdfNote({
        win: hiddenWin,
        filePath: absoluteFilePath,
        html: note.content,
        assets,
      });
      return {
        id: note.id,
        filePath,
      };
    });
    return exported.filter((note) => note !== null);
  } finally {
    if (!hiddenWin.isDestroyed()) {
      hiddenWin.destroy();
      console.log("Destroyed");
    }
  }
}

export { batchPDFExport };
