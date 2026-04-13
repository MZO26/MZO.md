import type { Result } from "../shared/types";

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element not found: "${selector}"`);
  }
  return element;
}

function getElementOrNull<T extends HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function setActiveItem(element: HTMLElement, parent: HTMLElement) {
  if (!element) return;
  const currentlyActive = parent.querySelector(".active");
  if (currentlyActive) {
    currentlyActive.classList.remove("active");
  }
  element.classList.add("active");
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
  return debounced;
}

function formatNoteDate(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function safeIpcCall<T>(
  ipcPromise: Promise<Result<T>>,
): Promise<Result<T>> {
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

export {
  debounce,
  formatNoteDate,
  getElement,
  getElementOrNull,
  safeIpcCall,
  setActiveItem,
};
