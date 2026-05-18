import db from "@electron/db/database";
import { writeAtomic } from "@electron/fs/fs-atomic-write";
import { validation } from "@shared/ipc-helpers";
import { FileNameSchema } from "@shared/schemas/export-schema";
import fs from "fs/promises";
import path from "path";

async function batchExport(folder: string, format: "json" | "md" | "txt") {
  await fs.mkdir(folder, { recursive: true });
  const iterator = db.exportIterator(format);
  const results: { id: string; filePath: string }[] = [];
  const activeWrites = new Set<Promise<void>>();
  const LIMIT = 100;
  const absoluteTargetFolder = path.resolve(folder);
  for (const note of iterator) {
    const fileName = `${validation(FileNameSchema, note.title)}_${note.id.slice(0, 6)}.${format}`;
    const absoluteFilePath = path.resolve(absoluteTargetFolder, fileName);
    const relative = path.relative(absoluteTargetFolder, absoluteFilePath);
    const isOutside = relative.startsWith("..") || path.isAbsolute(relative);
    if (isOutside) {
      continue;
    }
    let content: string;
    switch (format) {
      case "json":
        content = note.content ?? "";
        break;
      case "md":
        content = note.markdown ?? "";
        break;
      case "txt":
        content = note.plainText ?? "";
        break;
    }
    const writeTask = writeAtomic(absoluteFilePath, content).then(() => {
      results.push({ id: note.id, filePath: absoluteFilePath });
    });
    activeWrites.add(writeTask);
    writeTask.finally(() => activeWrites.delete(writeTask));

    if (activeWrites.size >= LIMIT) {
      await Promise.race(activeWrites);
    }
  }
  await Promise.all(activeWrites);
  return results;
}

export { batchExport };
