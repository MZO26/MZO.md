import type { JSONContent } from "@tiptap/core";

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

function setActiveItem(element: HTMLElement) {
  if (!element || !element.parentElement) return;
  const currentlyActive = element.parentElement.querySelector(".active");
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

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
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

function safeParse(content: string) {
  let jsonObj: JSONContent;
  try {
    if (content.trim() === "") {
      jsonObj = { type: "doc", content: [] };
    } else {
      jsonObj = JSON.parse(content);
    }
  } catch (error) {
    console.warn("Couldn't parse note as json, loading empty document", error);
    jsonObj = { type: "doc", content: [] };
  }
  return jsonObj;
}

export {
  debounce,
  formatNoteDate,
  getElement,
  getElementOrNull,
  safeParse,
  setActiveItem,
};
