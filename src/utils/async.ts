function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args; // Saves the last arguments for potential immediate execution
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func(...args);
      // After execution, clean up the timeout and last arguments
      timeout = null;
      lastArgs = null;
    }, wait);
  };

  // Add a flush method to allow immediate execution of the last call if it is pending
  debounced.flush = () => {
    if (timeout && lastArgs) {
      clearTimeout(timeout);
      func(...lastArgs);
      timeout = null;
      lastArgs = null;
    }
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      lastArgs = null;
    }
  };
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
