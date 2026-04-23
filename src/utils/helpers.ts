import type { JSONContent } from "@tiptap/core";
import {
  snippetGenerator,
  tagsGenerator,
  titleGenerator,
} from "../../shared/generators/generators";
import type { IpcResponse, NoteData } from "../../shared/types";

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element not found: "${selector}"`);
  }
  return element;
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

function getNoteData(
  content: {
    type: "doc";
    content: JSONContent[];
    attrs?: Record<string, unknown> | undefined;
  },
  plainText: unknown,
): NoteData {
  return {
    title: titleGenerator(plainText),
    snippet: snippetGenerator(plainText),
    tags: tagsGenerator(plainText),
    stringifiedContent: JSON.stringify(content),
    now: new Date().toISOString(),
  };
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

export {
  debounce,
  formatNoteDate,
  getElement,
  getNoteData,
  safeIpcCall,
  setActiveItem,
};
