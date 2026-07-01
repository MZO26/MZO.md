import type { PDFAssets } from "@shared/types";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";

let cachedPDFAssets: Promise<PDFAssets> | null = null;

async function loadPDFAssets() {
  const pdfFolder = path.join(app.getAppPath(), "shared", "pdf");
  const [templateFile, cssFile] = [
    path.join(pdfFolder, "pdf-export.html"),
    path.join(pdfFolder, "pdf-export.css"),
  ];
  const [template, css] = await Promise.all([
    fs.readFile(templateFile, "utf8"),
    fs.readFile(cssFile, "utf8"),
  ]);
  return { template, css };
}

function getPDFAssets() {
  cachedPDFAssets ??= loadPDFAssets().catch((error) => {
    cachedPDFAssets = null;
    throw error;
  });
  return cachedPDFAssets;
}

function renderPDFCanvas(safeData: string, assets: PDFAssets) {
  return assets.template
    .replace("<!-- __CSS_PLACEHOLDER__ -->", `<style>${assets.css}</style>`)
    .replace(
      "<!-- __CONTENT_PLACEHOLDER__ -->",
      `<div class="ProseMirror" id="content-root">${safeData}</div>`,
    );
}
export { getPDFAssets, loadPDFAssets, renderPDFCanvas };
