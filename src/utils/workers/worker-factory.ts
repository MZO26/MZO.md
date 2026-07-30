import { MAX_WORKER_TIMEOUT_MS } from "@shared/constants";
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
      let timer: ReturnType<typeof setTimeout>;
      const workerDone = () => {
        clearTimeout(timer);
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
      };
      const handleMessage = (
        event: MessageEvent<{ id: string } & WorkerResult<WOutput>>,
      ) => {
        if (event.data.id === id) {
          workerDone();
          if (event.data.success) {
            resolve({ success: true, data: event.data.data });
          } else {
            resolve({
              success: false,
              error: event.data.error,
            });
          }
        }
      };
      const handleError = () => {
        workerDone();
        resolve({ success: false, error: WorkerErrorCode.UnknownError });
      };
      timer = setTimeout(() => {
        workerDone();
        resolve({
          success: false,
          error: WorkerErrorCode.TimeoutError,
        });
      }, MAX_WORKER_TIMEOUT_MS);
      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage({ id, payload }, transferables);
    });
  };
}

export { createWorker, handleWorkerError, WorkerTaskError };
