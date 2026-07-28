import { requireElement } from "@/utils/dom";
import type { ExportContent } from "@shared/schemas/request-schema";
import { delegate, hideAll, type Placement } from "tippy.js";
import "tippy.js/animations/scale-subtle.css";
import "tippy.js/dist/tippy.css";

function createTooltipContent(baseText: string, shortcut?: string) {
  const tooltipContent = document.createElement("span");
  tooltipContent.textContent = baseText
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
  if (shortcut) {
    const formatted = formatShortcut(shortcut);
    const kbdElement = document.createElement("kbd");
    kbdElement.className = "tippy-shortcut";
    kbdElement.textContent = formatted;
    tooltipContent.appendChild(kbdElement);
  }
  return tooltipContent;
}

function isMac(): boolean {
  return window.appInfo.isMac;
}

function formatShortcut(shortcut?: string) {
  if (!shortcut) return "";
  const mac = isMac();
  return shortcut
    .replace(/mod[-+]?/gi, mac ? "⌘" : "Ctrl+")
    .replace(/ctrl[-+]?/gi, mac ? "⌃" : "Ctrl+")
    .replace(/shift[-+]?/gi, mac ? "⇧" : "Shift+")
    .replace(/alt[-+]?/gi, mac ? "⌥" : "Alt+")
    .replace(/meta[-+]?/gi, mac ? "⌘" : "Meta+");
}

function initTippyDelegate(
  container: HTMLElement,
  appendTo?: HTMLElement,
  placement?: Placement,
  hide: boolean = true,
) {
  delegate(container, {
    target: "[data-tippy-content]",
    theme: "app-theme",
    placement: placement ?? "auto",
    trigger: "mouseenter",
    appendTo: appendTo || container,
    animation: "scale-subtle",
    duration: [120, 90],
    offset: [0, 8],
    onShow(instance) {
      if (hide) hideAll({ exclude: instance });
      if (instance.reference.hasAttribute("data-tippy-dynamic")) {
        const baseText =
          instance.reference.getAttribute("data-tippy-content") || "";
        instance.setContent(baseText);
      }
    },
    onCreate: (instance) => {
      const reference = instance.reference;
      const baseText = reference.getAttribute("data-tippy-content") || "";
      if (reference.hasAttribute("data-shortcut")) {
        const shortcut = reference.getAttribute("data-shortcut") ?? undefined;
        instance.setContent(createTooltipContent(baseText, shortcut));
      }
    },
  });
}

function createGlobalSpinner(showDelay = 200) {
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
  initTippyDelegate,
  needsLandscape,
  waitForPaint,
};
