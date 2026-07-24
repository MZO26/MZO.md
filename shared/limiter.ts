import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { AppErrorCode } from "@shared/errors";

async function processWithLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  processItem: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  const results = new Array<R>(items.length);
  let nextItemIndex = 0;
  async function worker(): Promise<void> {
    for (const item of items) {
      const index = nextItemIndex++;
      results[index] = await processItem(item, index);
    }
  }
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

export { processWithLimit };
