import { AppBackendError, AppErrorCode } from "@shared/errors";

async function processWithLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  processItem: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  const results = new Array<R>(items.length);
  const queue = items.entries();
  async function worker(): Promise<void> {
    for (const [index, item] of queue) {
      results[index] = await processItem(item, index);
    }
  }
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

export { processWithLimit };
