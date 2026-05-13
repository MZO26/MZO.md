import { app } from "electron";
import * as fs from "fs";
import path from "path";

function createPDFCanvas(safeData: string): string {
  const isDev = !app.isPackaged;
  const baseDir = isDev ? app.getAppPath() : process.resourcesPath;
  const pdfFolder = path.join(baseDir, "shared", "pdf");
  const templateHtml = fs.readFileSync(
    path.join(pdfFolder, "pdf-export.html"),
    "utf8",
  );
  const cssContent = fs.readFileSync(
    path.join(pdfFolder, "pdf-export.css"),
    "utf8",
  );
  let htmlString = templateHtml
    .replace("<!-- __CSS_PLACEHOLDER__ -->", `<style>${cssContent}</style>`)
    .replace(
      "<!-- __CONTENT_PLACEHOLDER__ -->",
      `<div class="ProseMirror" id="content-root">${safeData}</div>`,
    );
  return htmlString;
}

export { createPDFCanvas };
