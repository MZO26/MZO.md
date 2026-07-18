import { sleep } from "@/utils/async";
import { requireElement } from "@/utils/dom";
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

function createGlobalSpinner(defaultDelay = 200) {
  const spinner = requireElement<HTMLDivElement>(".app-loading");
  return {
    async wrap<T>(
      task: Promise<T> | (() => Promise<T>),
      hideDelay = defaultDelay,
    ): Promise<T> {
      spinner.hidden = false;
      try {
        return typeof task === "function" ? await task() : await task;
      } finally {
        await sleep(hideDelay);
        spinner.hidden = true;
      }
    },
  };
}

export { createGlobalSpinner, createTooltipContent, initTippyDelegate };
