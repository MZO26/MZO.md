import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { AppErrorCode } from "@shared/errors";

async function processWithLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  processItem: (item: Readonly<T>, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  const results = new Array<R>(items.length);
  const iterator = items.entries();
  async function worker(): Promise<void> {
    for (const [index, item] of iterator) {
      results[index] = await processItem(item, index);
    }
  }
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

function throttle<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  ms: number,
) {
  const state: { busy: boolean; lastEnd: number } = { busy: false, lastEnd: 0 };
  return async (...args: A): Promise<T | undefined> => {
    if (state.busy || Date.now() - state.lastEnd < ms) return undefined;
    state.busy = true;
    try {
      return await fn(...args);
    } finally {
      state.busy = false;
      state.lastEnd = Date.now();
    }
  };
}

export { processWithLimit, throttle };
