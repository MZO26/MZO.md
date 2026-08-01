import { getTemplateItem } from "@/utils/registry";
import { createTooltipContent } from "@/utils/ui";
import type { TemplateRegistry } from "@shared/types";

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

function findElement<T extends HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document,
): T | null {
  return parent.querySelector<T>(selector);
}

function setActiveItem(element: HTMLElement | null, parent: HTMLElement) {
  if (!element) return;
  const currentlyActive = parent.querySelector(".is-active");
  if (currentlyActive) {
    currentlyActive.classList.remove("is-active");
  }
  element.classList.add("is-active");
}

function createIconButton(icon: string, tooltip?: string): HTMLButtonElement {
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

function createTemplateCloner<T extends Element>(
  template: keyof TemplateRegistry,
  fn: (node: Node | null) => node is T,
) {
  let cachedNode: T | null = null;
  return function getClone(): T {
    if (!cachedNode) {
      const templateElement = getTemplateItem(template);
      if (!(templateElement instanceof HTMLTemplateElement)) {
        throw new Error(`Element '${template}' is not a template.`);
      }
      const templateChild = templateElement.content.firstElementChild;
      if (!fn(templateChild)) {
        throw new Error(`Template '${template}' is missing.`);
      }
      cachedNode = templateChild;
    }
    const clonedNode = cachedNode.cloneNode(true);
    if (!fn(clonedNode)) {
      throw new Error(`Failed to clone template '${template}'.`);
    }
    return clonedNode;
  };
}

function isDiv(node: Node | null): node is HTMLDivElement {
  return node instanceof HTMLDivElement;
}

export {
  createIconButton,
  createInfoSpan,
  createTemplateCloner,
  findElement,
  isDiv,
  requireElement,
  setActiveItem,
};
