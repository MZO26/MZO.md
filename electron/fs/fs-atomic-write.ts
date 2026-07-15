import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { AppErrorCode } from "@shared/errors";
import { open, rename, unlink, type FileHandle } from "node:fs/promises";

async function writeAtomic(
  targetPath: string,
  content: string | Buffer | Uint8Array,
) {
  const tempPath = `${targetPath}.${crypto.randomUUID()}.tmp`;
  let fileHandle: FileHandle | undefined;
  let writeSucceeded = false;
  try {
    // open the temp file for writing
    fileHandle = await open(tempPath, "wx");
    // writes all new data into the temp file. If an error comes up, it jumps to finally and closes the temp file
    await fileHandle?.writeFile(content);
    // flush saves file contents from memory to the fs
    await fileHandle?.datasync();
    writeSucceeded = true;
  } finally {
    await fileHandle?.close();
    if (!writeSucceeded) {
      await unlink(tempPath).catch(() => {});
    }
  }
  // temp file is fully written and closed and gets renamed to targetPath from tempPath
  try {
    await rename(tempPath, targetPath);
  } catch (error) {
    // ignore errors while deleting temp file to throw more important error if save failed
    await unlink(tempPath).catch(() => {});
    throw new AppBackendError(AppErrorCode.FileWriteError);
  }
}

export { writeAtomic };
