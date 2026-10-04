import { requireElement } from "@/utils/dom";

function createTooltipContent(baseText: string) {
  return baseText
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function createGlobalSpinner(showDelay: number = 200) {
  const spinner = requireElement<HTMLDivElement>(".app-loading");
  return {
    async wrap<T>(
      task: Promise<T> | (() => Promise<T>),
      delay = showDelay,
    ): Promise<T> {
      const showTimer = setTimeout(() => {
        spinner.hidden = false;
      }, delay);
      try {
        return typeof task === "function" ? await task() : await task;
      } finally {
        clearTimeout(showTimer);
        spinner.hidden = true;
      }
    },
  };
}

function isDiv(node: Node | null): node is HTMLDivElement {
  return node instanceof HTMLDivElement;
}

export { createGlobalSpinner, createTooltipContent, isDiv };
