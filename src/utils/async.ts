type Debounced<T extends (...args: any[]) => void> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
  flush: () => void;
};

function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
): Debounced<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  function cancel() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  }
  function flush() {
    if (timer === null || lastArgs === null) return;
    const args = lastArgs;
    cancel();
    fn(...args);
  }
  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      const argsToUse = lastArgs;
      timer = null;
      lastArgs = null;
      if (argsToUse !== null) {
        fn(...argsToUse);
      }
    }, wait);
  }) as Debounced<T>;
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

// for async event listeners

function createAsyncHandler<T extends Event>(
  callback: (e: T) => Promise<void> | void,
) {
  let isProcessing = false;
  return async (e: T) => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      await callback(e);
    } catch (error) {
      console.error("[createAsyncHandler]: Async Error: ", error);
    } finally {
      isProcessing = false;
    }
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export { createAsyncHandler, debounce, sleep };
