import { requireElement } from "@/utils/dom";
import type { ExportContent } from "@shared/schemas/request-schema";

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

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForPaint(frames = 2): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await nextFrame();
  }
}

function needsLandscape(
  content: Extract<ExportContent["extension"], "html">,
): boolean {
  const dom = new DOMParser().parseFromString(content, "text/html");
  for (const table of dom.querySelectorAll<HTMLTableElement>("table")) {
    const firstRow = table.querySelector<HTMLTableRowElement>("tr");
    if (!firstRow) continue;
    let columnCount = 0;
    for (const cell of firstRow.querySelectorAll<HTMLTableCellElement>(
      "th, td",
    )) {
      columnCount += Number(cell.getAttribute("colspan")) || 1;
    }
    if (columnCount >= 5) return true;
  }
  return false;
}

export {
  createGlobalSpinner,
  createTooltipContent,
  needsLandscape,
  waitForPaint,
};
