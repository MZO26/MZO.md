import { showContextMenu } from "@/api/electronAPI";
import { formatShortcut } from "@/utils/format";
import { findElement } from "./dom";

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
  const spinner = findElement("#loadingSpinner");
  const overlay = findElement(".overlay");
  if (!spinner || !overlay) return () => {};
  const overlayExisting = overlay.classList.contains("show");
  const spinnerExisting = spinner.classList.contains("show");
  const spinnerTimeout = setTimeout(() => {
    if (!overlayExisting) {
      overlay.classList.add("show");
    }
    if (!spinnerExisting) {
      spinner.classList.add("show");
    }
  }, delay);

  return function cleanup() {
    clearTimeout(spinnerTimeout);
    if (!overlayExisting) {
      overlay.classList.remove("show");
    }
    if (!spinnerExisting) {
      spinner.classList.remove("show");
    }
  };
}

async function createContextMenu(e: Event) {
  const target = e.target as HTMLElement;
  const item = target.closest<HTMLElement>(".noteItem");
  if (!item) return;
  e.preventDefault();
  const id = item.dataset["id"];
  const pinned = item.dataset["pinned"] === "true";
  const bookmarked = item.dataset["bookmarked"] === "true";
  if (!id) return;
  await showContextMenu(id, pinned, bookmarked);
}

export { createContextMenu, createTooltipContent, useDelayedSpinner };
