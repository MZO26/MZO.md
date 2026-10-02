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

function singleFlight<A extends unknown[], T>(fn: (...args: A) => Promise<T>) {
  const state: { current: Promise<T> | null } = { current: null };
  return (...args: A): Promise<T> =>
    (state.current ??= fn(...args).finally(() => {
      state.current = null;
    }));
}

export { processWithLimit, singleFlight };
