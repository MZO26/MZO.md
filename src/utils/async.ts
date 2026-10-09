import { rendererLogger } from "@/app";

type Debounced<A extends (...args: any[]) => void> = ((
  ...args: Parameters<A>
) => void) & {
  cancel: () => void;
  flush: () => void;
};

function debounce<A extends (...args: any[]) => void>(
  fn: A,
  wait: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<A> | null = null;
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
  const debounced = ((...args: Parameters<A>) => {
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
  }) as Debounced<A>;
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
      rendererLogger.appError("[createAsyncHandler]: Async Error: ", error);
    } finally {
      isProcessing = false;
    }
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForPaint(frames = 2): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await nextFrame();
  }
}

// mainly for worker markdown parse evaluation

function withPerformanceLog<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
) {
  return async (...args: A): Promise<T> => {
    // same label for time and timeEnd
    const timerLabel = `Invoking function ${fn.name}`;
    rendererLogger.time(timerLabel);
    try {
      const data = await fn(...args);
      rendererLogger.timeEnd(timerLabel);
      return data;
    } catch (error) {
      rendererLogger.timeEnd(timerLabel);
      rendererLogger.appError(`Error invoking function ${fn.name}`, error);
      throw error;
    }
  };
}

export {
  createAsyncHandler,
  debounce,
  sleep,
  waitForPaint,
  withPerformanceLog,
};
