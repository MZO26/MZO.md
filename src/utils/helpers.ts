function truncate(str: string, max = 10): string {
  if (str.length > max) {
    return str.slice(0, max) + "...";
  } else return str;
}

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

export { debounce, getElement, getElementOrNull, truncate };
