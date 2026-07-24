import { WorkerErrorCode } from "@shared/errors";
import type { WorkerResult } from "@shared/types";

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

function createWorker<WInput, WOutput>(worker: Worker | null) {
  return function work(
    payload: WInput,
    transferables: Transferable[] = [],
  ): Promise<WorkerResult<WOutput>> {
    return new Promise((resolve) => {
      if (!worker) {
        resolve({ success: false, error: WorkerErrorCode.InitializeError });
        return;
      }
      const id = crypto.randomUUID();
      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === id) {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
          if (event.data.success) {
            resolve({ success: true, data: event.data.data as WOutput });
          } else {
            resolve({
              success: false,
              error: event.data.error as WorkerErrorCode,
            });
          }
        }
      };
      const handleError = () => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        resolve({ success: false, error: WorkerErrorCode.UnknownError });
      };
      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage({ id, payload }, transferables);
    });
  };
}

export { createWorker, handleWorkerError, WorkerTaskError };
