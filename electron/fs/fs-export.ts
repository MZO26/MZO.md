import { processWithLimit } from "@electron/concurrent";
import {
  dedupeFileNames,
  getFilePath,
  sanitizeExportString,
  withRetry,
  writeAtomic,
} from "@electron/fs/fs-helpers";
import {
  createHiddenPdfWindow,
  getPDFAssets,
  renderPDFCanvas,
} from "@electron/handler/pdf-handler";
import { mainLogger } from "@electron/handler/permission-handler";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import type { ExportContent } from "@shared/schemas/request-schema";
import type { PDFAssets } from "@shared/shared-types";
import type { BrowserWindow, PrintToPDFOptions } from "electron";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";

async function singleExport(filePath: string, data: ExportContent["content"]) {
  const absoluteTargetFolder = path.dirname(filePath);
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "Images");
  const portableContent = await sanitizeExportString(
    data,
    absoluteTargetFolder,
    imagesFolder,
  );
  try {
    await withRetry(writeAtomic)(filePath, portableContent);
  } catch (error) {
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
  return filePath;
}

async function batchExport(folder: string, payload: ExportContent[]) {
  if (payload.length === 0) return [];
  const uniqueExtensions = new Set(
    payload.map((c) => c.extension.toLowerCase()),
  );
  if (uniqueExtensions.size > 1) {
    const list = Array.from(uniqueExtensions).join(", ");
    mainLogger.appError(
      `[batchExport]: Only one extension allowed and ${uniqueExtensions.size} were given: ${list}}`,
    );
    throw new AppBackendError(AppErrorCode.ExportError);
  }
  const absoluteTargetFolder = path.resolve(folder);
  await fs.mkdir(absoluteTargetFolder, { recursive: true });
  const userDataPath = app.getPath("userData");
  const imagesFolder = path.join(userDataPath, "Images");
  const assetsDir = path.join(absoluteTargetFolder, "assets");
  const isPdf = uniqueExtensions.has("pdf");
  const limit = isPdf ? 1 : 3;
  const updatedPayload = dedupeFileNames(payload);
  let hiddenWin: BrowserWindow | null = null;
  let pdfAssets: PDFAssets | null = null;
  try {
    if (isPdf) {
      pdfAssets = await getPDFAssets();
      hiddenWin = createHiddenPdfWindow();
    } else {
      await fs.mkdir(assetsDir, { recursive: true });
    }
    const exported = await processWithLimit(
      updatedPayload,
      limit,
      async (item: ExportContent): Promise<string | null> => {
        try {
          const absoluteFilePath = await getFilePath(
            absoluteTargetFolder,
            item,
          );
          if (isPdf && item.extension === "pdf") {
            if (!pdfAssets || !hiddenWin || hiddenWin.isDestroyed()) {
              mainLogger.appError(
                "[batchExport]: Failed to access pdf printing requirements",
              );
              throw new AppBackendError(AppErrorCode.CancelledOperation);
            }
            return await exportPDFNote({
              win: hiddenWin,
              landscape: item.landscape,
              filePath: absoluteFilePath,
              html: item.content,
              assets: pdfAssets,
            });
          }
          const portableContent = await sanitizeExportString(
            item.content,
            assetsDir,
            imagesFolder,
          );
          await writeAtomic(absoluteFilePath, portableContent);
          return absoluteFilePath;
        } catch (error) {
          mainLogger.appError("[batchExport]: Error while exporting:", error);
          return null;
        }
      },
    );
    return exported.filter((item): item is string => item !== null);
  } finally {
    if (hiddenWin && !hiddenWin.isDestroyed()) {
      hiddenWin.destroy();
      hiddenWin = null;
    }
  }
}

type GeneratePDFParams = {
  win: BrowserWindow;
  landscape: boolean;
  html: string;
  assets: PDFAssets;
};

type ExportPDFParams = GeneratePDFParams & { filePath: string };

async function generatePDFBuffer(params: GeneratePDFParams): Promise<Buffer> {
  const { win, landscape, html, assets } = params;
  if (!win || win.isDestroyed() || win.webContents.isDestroyed())
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  const pdfOptions: PrintToPDFOptions = {
    pageSize: "A4",
    printBackground: true,
    landscape,
  };
  const htmlString = renderPDFCanvas(html, assets);
  const encoded = Buffer.from(htmlString, "utf8").toString("base64");
  await win.loadURL(`data:text/html;base64,${encoded}`);
  return await win.webContents.printToPDF(pdfOptions);
}

async function exportPDFNote(params: ExportPDFParams): Promise<string> {
  const { filePath, ...generateParams } = params;
  const pdfBuffer = await generatePDFBuffer(generateParams);
  try {
    await withRetry(writeAtomic)(filePath, pdfBuffer);
  } catch (error) {
    mainLogger.appError("Failed to export PDF note", error);
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
  return filePath;
}

async function singlePDFExport(
  filePath: string,
  data: string,
  landscape: boolean,
) {
  const hiddenWin = createHiddenPdfWindow();
  const assets = await getPDFAssets();
  try {
    await exportPDFNote({
      win: hiddenWin,
      landscape,
      filePath,
      html: data,
      assets,
    });
  } catch (error) {
    mainLogger.appError("[singlePDFExport]: Error writing PDF file:", error);
    throw new AppBackendError(AppErrorCode.FileWriteError);
  } finally {
    if (hiddenWin && !hiddenWin.isDestroyed()) {
      hiddenWin.destroy();
    }
  }
}

export { batchExport, singleExport, singlePDFExport };
