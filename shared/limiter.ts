async function processWithLimit<T, R>(
  // T is type of item array / R is return value of the promise from fn
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  // pre-allocate empty array with number of slots to be filled
  const results: R[] = new Array(items.length);
  // see how many files are being read
  const executing = new Set<Promise<void>>();
  for (const [i, item] of items.entries()) {
    // .then to tell the promise what to do when it finishes
    const promise = fn(item, i)
      .then((result) => {
        // result gets put at exact pre-allocated array slot
        results[i] = result;
      })
      .finally(() => executing.delete(promise));
    // gets removed out of the executing set
    // even though file isn't finished reading yet, the next promise gets added to the set
    executing.add(promise);
    // if set entries get bigger than limit, remaining ones have to wait until at least one promise resolves. loop stops here and waits
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  // wait until every promise has finished. Otherwise result array would be incomplete
  await Promise.all(executing);
  return results;
}

const noteLocks = new Map<string, Promise<void>>(); // queue of promises for each note id
export const lastSyncedTitle = new Map<string, string>(); // last filename that was on disk

function runWithNoteLock<T>(id: string, task: () => Promise<T>): Promise<T> {
  const prev = noteLocks.get(id) ?? Promise.resolve();
  const result = prev.then(() => task());
  const tail: Promise<void> = result.then(
    () => {},
    () => {},
  );
  noteLocks.set(id, tail);
  tail.finally(() => {
    if (noteLocks.get(id) === tail) {
      noteLocks.delete(id);
      lastSyncedTitle.delete(id);
    }
  });
  return result;
}

export { processWithLimit, runWithNoteLock };
