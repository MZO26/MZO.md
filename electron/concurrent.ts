import { AppBackendError, AppErrorCode } from "@shared/errors";

/**
 * Processes an array of items with a maximum concurrency limit, preserving
 * result order.
 *
 * Spawns at most `concurrency` async workers that pull items from a shared
 * iterator. Results are written to their original index position.
 *
 * @param items - The items to process.
 * @param concurrency - Maximum number of in-flight operations (must be ≥ 1).
 * @param processItem - Async function called for each item with its original index.
 * @returns An array of results in the same order as `items`.
 * @throws {AppBackendError} If `concurrency` is not a positive integer.
 *
 * @example
 * const results = await processWithLimit(urls, 5, (url, i) => fetchFile(url));
 */

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
