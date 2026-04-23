import Store from "electron-store";
import z from "zod";
import { StoreSchema, type Settings } from "../shared/schemas/storeSchema";

export const store = new Store<Settings>();

function validateStore() {
  const data = store.store;
  const validatedData = StoreSchema.safeParse(data);
  if (!validatedData.success) {
    console.warn("Error: ", z.treeifyError(validatedData.error));
    const safeData = StoreSchema.parse({});
    store.store = safeData;
  } else {
    store.store = validatedData.data;
  }
}

function taskQueue() {
  // resolved promise -> Always represents the last task
  let tail = Promise.resolve();

  return async function <T>(task: () => Promise<T>): Promise<T> {
    // previous lock gets either resolve for first task or on succession a new Promise which is bound to the current task
    const previousLock = tail;
    // signal if current task is done and next task can start. It will signal no matter what (success or error)
    let releaseNext!: () => void;
    // task officially gets in line and tail variable assigns itself to a deferred promise
    tail = new Promise((resolve) => {
      releaseNext = resolve;
    });
    try {
      // task gets paused until task beforehand is finished which is represented by previousLock. First time no block because of tail Promise.resolve. Second task has to wait resolve of promise bound to releaseNext call in finally
      await previousLock;
      // actual task gets run
      return await task();
    } finally {
      // task is finished (with success or not) so release next gets called which is bound to the resolve of the promise. Next task can start
      releaseNext();
    }
  };
}

validateStore();

export { taskQueue };
