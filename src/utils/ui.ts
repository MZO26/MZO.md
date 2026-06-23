import { findElement } from "@/utils/dom";
import { delegate, hideAll, type Placement } from "tippy.js";
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

function useDelayedSpinner(delay = 100) {
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

export {
  createTooltipContent,
  formatBytes,
  initTippyDelegate,
  useDelayedSpinner,
};
