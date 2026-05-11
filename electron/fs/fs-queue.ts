// map that holds last promise in line for each note id
const noteLocks = new Map<string, Promise<unknown>>();

function createMutex<T>(id: string, task: () => Promise<T>) {
  // get the current line, or start a new one if undefined
  const prev = noteLocks.get(id) ?? Promise.resolve();

  // task gets attached and only starts after currentLine has finished. result is the promise
  const result = prev.then(() => task());

  // chain end for mutex internals. never gets returned but absorbs errors so the queue doesn't break and helps with cleanup of the map
  const chainEnd = result.catch(() => {});
  noteLocks.set(id, chainEnd);
  chainEnd.finally(() => {
    if (noteLocks.get(id) === chainEnd) {
      noteLocks.delete(id);
    }
  });
  return result;
}

export { createMutex };
