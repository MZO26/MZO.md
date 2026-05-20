import { findElement } from "@/utils/dom";
import { formatShortcut } from "@/utils/format";

function createTooltipContent(
  baseText: string,
  shortcut?: string,
): HTMLSpanElement {
  const tooltipContent = document.createElement("span");
  tooltipContent.textContent = baseText;
  if (shortcut) {
    const formatted = formatShortcut(shortcut);
    const kbdElement = document.createElement("kbd");
    kbdElement.className = "tippy-shortcut";
    kbdElement.textContent = formatted;
    tooltipContent.appendChild(kbdElement);
  }
  return tooltipContent;
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

function animateTextChange(
  el: HTMLElement | null,
  text: string,
  duration = 200,
) {
  if (!el || el.textContent === text) return;
  const half = duration / 2;
  el.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: half,
    easing: "linear",
    fill: "forwards",
  }).finished.then(() => {
    el.textContent = text;
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: half,
      easing: "linear",
      fill: "forwards",
    });
  });
}

export { animateTextChange, createTooltipContent, useDelayedSpinner };
