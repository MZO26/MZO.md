import { findElement } from "@/utils/dom";
import { delegate } from "tippy.js";
import "tippy.js/dist/tippy.css";

function createTooltipContent(
  baseText: string,
  shortcut?: string,
): HTMLSpanElement {
  const tooltipContent = document.createElement("span");
  tooltipContent.textContent = baseText
    .replace(/([a-z])([A-Z])/g, "$1 $2")
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

function formatShortcut(shortcut?: string): string {
  if (!shortcut) return "";

  const isMac = typeof process !== "undefined" && process.platform === "darwin";

  return shortcut
    .replace(/mod[-+]?/gi, isMac ? "⌘" : "Ctrl+")
    .replace(/shift[-+]?/gi, isMac ? "⇧" : "Shift+")
    .replace(/alt[-+]?/gi, isMac ? "⌥" : "Alt+")
    .replace(/meta[-+]?/gi, isMac ? "⌘" : "Meta+");
}

function useDelayedSpinner(delay = 300) {
  const spinner = findElement<HTMLDivElement>(".spinner");
  if (!spinner) return () => {};
  const wasAlreadyOpen = spinner.matches(":popover-open");
  const spinnerTimeout = setTimeout(() => {
    if (!wasAlreadyOpen && !spinner.matches(":popover-open")) {
      spinner.showPopover();
    }
  }, delay);
  return function cleanup() {
    clearTimeout(spinnerTimeout);
    if (!wasAlreadyOpen && spinner.matches(":popover-open")) {
      spinner.hidePopover();
    }
  };
}

function initTippyDelegate(container: HTMLElement, appendTo?: HTMLElement) {
  delegate(container, {
    target: "[data-tippy-content]",
    theme: "app-theme",
    trigger: "mouseenter focus",
    appendTo: appendTo || container,
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

export { createTooltipContent, initTippyDelegate, useDelayedSpinner };
