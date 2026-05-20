import fs from "fs";
import path from "path";

function sanitizeExportString(
  content: string,
  exportDir: string,
  internalImgDir: string,
) {
  const assetsDir = path.join(exportDir, "assets");
  const regex = /appimg:\/\/\/([^"' )>\s]+)/g;
  const portableContent = content.replace(regex, (_fullMatch, fileName) => {
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    const internalPath = path.join(internalImgDir, fileName);
    const exportPath = path.join(assetsDir, fileName);
    if (fs.existsSync(internalPath)) {
      fs.copyFileSync(internalPath, exportPath);
    }
    return `assets/${fileName}`;
  });
  return portableContent;
}

function sanitizeImportString(
  importedContent: string,
  importedFileDir: string,
  internalImgDir: string,
) {
  const regex = /(?:\.\/)?assets\/([^"' )>\s]+)/g;
  const internalContent = importedContent.replace(
    regex,
    (_fullMatch, fileName) => {
      const sourceImagePath = path.join(importedFileDir, "assets", fileName);
      const destImagePath = path.join(internalImgDir, fileName);
      if (!fs.existsSync(internalImgDir)) {
        fs.mkdirSync(internalImgDir, { recursive: true });
      }
      if (fs.existsSync(sourceImagePath)) {
        fs.copyFileSync(sourceImagePath, destImagePath);
      }
      return `appimg:///${fileName}`;
    },
  );

  return internalContent;
}

export { sanitizeExportString, sanitizeImportString };
