import { open, rename, unlink, type FileHandle } from "node:fs/promises";

async function writeAtomic(targetPath: string, content: string): Promise<void> {
  const tempPath = `${targetPath}.tmp`;
  let fileHandle: FileHandle | undefined;

  try {
    // open the temp file for writing
    fileHandle = await open(tempPath, "w");
    // writes all new data into the temp file. If an error comes up, it jumps to finally and closes the temp file
    await fileHandle.writeFile(content, "utf8");
    // flush saves file contents from memory to the fs
    await fileHandle.sync();
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
  // temp file is fully written and closed and gets renamed to targetPath from tempPath
  try {
    await rename(tempPath, targetPath);
  } catch (error) {
    // ignore errors while deleting temp file to throw more important error if save failed
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}

export { writeAtomic };
