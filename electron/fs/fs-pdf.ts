import { writeAtomic } from "@electron/fs/fs-atomic-write";
import { loadPDFAssets, renderPDFCanvas } from "@electron/handler/pdf-handler";
import type { BrowserWindow, PrintToPDFOptions } from "electron";

async function exportPdfNote(params: {
  win: BrowserWindow;
  filePath: string;
  html: string;
  assets: ReturnType<typeof loadPDFAssets>;
}): Promise<string> {
  const { win, filePath, html, assets } = params;
  const pdfOptions: PrintToPDFOptions = {
    pageSize: "A4",
    printBackground: true,
    landscape: false,
  };
  const htmlString = renderPDFCanvas(html, assets);
  const encoded = Buffer.from(htmlString, "utf8").toString("base64");
  // converts htmlString into bytes using utf8 encoding (Buffer is Node.js's raw byte array). toString(base64) then takes those bytes and encodes them as base64 which only allows A-Z a-z 0-9 + / = chars.
  if (!win.isDestroyed() && !win.webContents.isDestroyed())
    await win.loadURL(`data:text/html;base64,${encoded}`);
  // data:text/html tells chrome parse as html and base64 tells chrome to decode before parsing with the exact html bytes. Base64 is required to load the css correctly because chrome expects URL's to have URL-encoded content.
  const pdfBuffer = await win.webContents.printToPDF(pdfOptions);
  await writeAtomic(filePath, pdfBuffer);
  return filePath;
}

export { exportPdfNote };
