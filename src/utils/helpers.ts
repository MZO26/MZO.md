import type { IpcResponse } from "@shared/types";

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element not found: "${selector}"`);
  }
  return element;
}

function setActiveItem(element: HTMLElement, parent: HTMLElement) {
  if (!element) return;
  const currentlyActive = parent.querySelector(".is-active");
  if (currentlyActive) {
    currentlyActive.classList.remove("is-active");
  }
  element.classList.add("is-active");
}

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

async function safeIpcCall<T>(
  ipcPromise: Promise<IpcResponse<T>>,
): Promise<IpcResponse<T>> {
  try {
    return await ipcPromise;
  } catch (error) {
    console.error("IPC error: ", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unknown communication error occurred";

    return { success: false, message: errorMessage };
  }
}

// guard to prevent race conditions on multiple clicks
function createAsyncHandler<T extends Event>(
  callback: (event: T) => Promise<void>,
) {
  let isProcessing = false;
  return async (event: T) => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      await callback(event);
    } catch (error) {
      console.error("Async Handler Error: ", error);
    } finally {
      isProcessing = false;
    }
  };
}

function formatShortcut(shortcut?: string): string {
  if (!shortcut) return "";

  const isMac =
    typeof window !== "undefined"
      ? navigator.userAgent.toUpperCase().indexOf("MAC") >= 0
      : false;

  const modifier = isMac ? "⌘" : "Ctrl+";
  let formatted = shortcut.replace(/mod[-+]?/gi, modifier);

  if (isMac) {
    formatted = formatted.replace(/shift[-+]?/gi, "⇧");
    formatted = formatted.replace(/alt[-+]?/gi, "⌥");
  } else {
    formatted = formatted.replace(/shift[-+]?/gi, "Shift+");
    formatted = formatted.replace(/alt[-+]?/gi, "Alt+");
  }
  return formatted.toUpperCase();
}

export {
  createAsyncHandler,
  debounce,
  formatShortcut,
  getElement,
  safeIpcCall,
  setActiveItem,
};
