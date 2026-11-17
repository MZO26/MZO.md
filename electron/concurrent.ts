import { AppBackendError, AppErrorCode } from "@shared/errors";

/**
 * Processes items from any iterable with a bounded concurrency limit,
 * preserving result order.
 *
 * Spawns at most `concurrency` async workers that pull items from a shared
 * iterator. Each result is written to its sequential index position, so the
 * returned array mirrors the iteration order of the input.
 *
 * @template T - Type of each input item.
 * @template R - Type of each processed result.
 *
 * @param items - Any iterable collection (Array, Set, Map, custom iterator).
 * @param concurrency - Maximum number of in-flight `processItem` calls (must be a positive integer ≥ 1).
 * @param processItem - Async callback invoked for each item; receives the item
 *   and its 0-based position in iteration order.
 * @returns A fully-resolved array of results in the same order as the input iterable.
 * @throws {AppBackendError} If `concurrency` is not a positive integer
 *   (thrown with error code `CancelledOperation`).
 *
@example
 * ```ts
 * const paths = ["./report.pdf", "./invoice.pdf", "./notes.txt"];
 * // buffers[0] ↔ "./report.pdf", buffers[1] ↔ "./invoice.pdf", …
 * const buffers = await processWithLimit(paths, 2, async (p) => fs.readFile(p));
 * ```
 */

async function processWithLimit<T, R>(
  items: Iterable<T>,
  concurrency: number,
  processItem: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new AppBackendError(AppErrorCode.CancelledOperation);
  }
  const knownSize = Array.isArray(items)
    ? items.length
    : items instanceof Set || items instanceof Map
      ? items.size
      : undefined;
  if (knownSize === 0) return [];

  const workerCount = knownSize !== undefined ? Math.min(concurrency, knownSize) : concurrency;
  const iterator = Iterator.from(items);
  const results: R[] = knownSize !== undefined ? new Array<R>(knownSize) : [];
  let nextIndex = 0;
  let aborted = false;

  async function worker(): Promise<void> {
    while (!aborted) {
      const next = iterator.next();
      if (next.done) break;
      const index = nextIndex++;
      try {
        results[index] = await processItem(next.value, index);
      } catch (error: unknown) {
        aborted = true;
        throw error;
      }
    }
  }

  const workers = Array.from({ length: workerCount }, () => worker());
  try {
    await Promise.all(workers);
    return results;
  } finally {
    iterator.return?.();
  }
}

export { processWithLimit };
