/// <reference lib="webworker" />
import { compressImage } from "@/extensions/image/image-utils";
import { WorkerErrorCode } from "@shared/constants";

self.onmessage = async (e: MessageEvent) => {
  const { id, file, maxWidth, quality } = e.data;
  try {
    const result = await compressImage(file, maxWidth, quality);
    self.postMessage({ id, success: true, data: result }, [result.buffer]);
  } catch (error) {
    self.postMessage({ id, ...handleWorkerError(error) });
  }
};

class WorkerTaskError extends Error {
  constructor(
    public readonly code: WorkerErrorCode,
    message?: string,
  ) {
    super(message || code);
    this.name = "WorkerTaskError";
  }
}

function handleWorkerError(err: unknown): {
  success: false;
  error: WorkerErrorCode;
} {
  if (err instanceof WorkerTaskError) {
    return { success: false, error: err.code };
  }
  console.error("[Worker Error]: ", err);
  return {
    success: false,
    error: WorkerErrorCode.UnknownError,
  };
}

export { handleWorkerError, WorkerTaskError };
