import { exportPdfNote } from "@electron/fs/fs-pdf";
import { loadPDFAssets } from "@electron/handler/pdf-handler";
import { createHiddenPdfWindow } from "@electron/win";
import { validation } from "@shared/ipc-helpers";
import { processWithLimit } from "@shared/limiter";
import { FileNameSchema } from "@shared/schemas/export-schema";
import type { ExportedContent, ExportResult } from "@shared/types";
import fs from "fs/promises";
import path from "path";

async function batchPDFExport(
  folder: string,
  payload: ExportedContent[],
): Promise<ExportResult[]> {
  await fs.mkdir(folder, { recursive: true });
  const absoluteTargetFolder = path.resolve(folder);
  const assets = loadPDFAssets();
  let hiddenWin = createHiddenPdfWindow();
  try {
    const exported = await processWithLimit(payload, 1, async (item) => {
      const fileName = `${validation(FileNameSchema, item.fileName)}_${item.id.slice(0, 6)}.pdf`;
      const absoluteFilePath = path.resolve(absoluteTargetFolder, fileName);
      const relative = path.relative(absoluteTargetFolder, absoluteFilePath);
      const isOutside = relative.startsWith("..") || path.isAbsolute(relative);
      if (isOutside) {
        return null;
      }
      const filePath = await exportPdfNote({
        win: hiddenWin,
        filePath: absoluteFilePath,
        html: item.content,
        assets,
      });
      return {
        id: item.id,
        filePath,
      };
    });
    return exported.filter((item): item is ExportResult => item !== null);
  } finally {
    if (!hiddenWin.isDestroyed()) {
      hiddenWin.destroy();
    }
  }
}

export { batchPDFExport };
