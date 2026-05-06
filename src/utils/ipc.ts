import type { IpcResponse } from "@shared/types";

async function safeIpcCall<T>(
  ipcPromise: Promise<IpcResponse<T>>,
): Promise<IpcResponse<T>> {
  try {
    return await ipcPromise;
  } catch (err: unknown) {
    console.error("IPC error: ", err);
    const msg =
      err instanceof Error
        ? err.message
        : "An unknown communication error occurred";

    return { success: false, message: msg };
  }
}

export { safeIpcCall };
