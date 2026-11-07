import { MAX_WORKER_TIMEOUT_MS } from "@/utils/constants";
import type { WorkerResult } from "@/utils/types";
import { handleWorkerError, WorkerErrorCode } from "@shared/errors";
import type { Id } from "@shared/schemas/note-schema";

/**
 * Creates a promisified message-passing wrapper around a Web Worker.
 *
 * Each call posts a payload to the worker and waits for the matching
 * response (correlated via a random UUID). Includes:
 * - Timeout guard (`MAX_WORKER_TIMEOUT_MS`) → resolves with `TimeoutError`.
 * - Worker crash handler → resolves with `UnknownError`.
 * - Listener cleanup after every completed call.
 *
 * The returned promise **never rejects**; failures are encoded in the
 * `WorkerResult` shape.
 *
 * @param worker - An existing `Worker` instance, or `null` if not yet initialized.
 * @returns A function that sends a task to the worker and resolves with the typed result.
 *
 * @example
 * const runWorker = createWorker<ImageData, ProcessedImage>(myWorker);
 * const { success, data } = await runWorker(canvas, [canvas]);
 */

function createWorker<T, R>(worker: Worker | null) {
  return function work(
    payload: T,
    transferables: Transferable[] = [],
  ): Promise<WorkerResult<R>> {
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
        event: MessageEvent<{ id: Id } & WorkerResult<R>>,
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

export { createWorker, handleWorkerError };
