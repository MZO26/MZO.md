import type { AppIcons } from "@/utils/types";
import { createTooltipContent } from "@/utils/ui";

function requireElement<T extends HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document,
): T {
  const element = parent.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element not found: "${selector}"`);
  }
  return element;
}

function setActiveItem(element: HTMLElement | null, parent: HTMLElement) {
  if (!element) return;
  const currentlyActive = parent.querySelector(".is-active");
  if (currentlyActive) {
    currentlyActive.classList.remove("is-active");
  }
  element.classList.add("is-active");
}

function createIconButton(icon: AppIcons, tooltip?: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  const i = document.createElement("i");
  i.setAttribute("data-lucide", icon);
  btn.appendChild(i);
  if (tooltip) btn.title = createTooltipContent(tooltip);
  return btn;
}

function createInfoSpan(
  textContent: string,
  className?: string,
): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `info-span ${className}`;
  span.textContent = textContent;
  return span;
}

export { createIconButton, createInfoSpan, requireElement, setActiveItem };
