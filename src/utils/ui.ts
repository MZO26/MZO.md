import { useTemplates, type TemplateRegistry } from "@/utils/registry";
import type { AppIcons } from "@/utils/types";

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

function createTooltipContent(baseText: string) {
  return baseText
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function createGlobalSpinner(showDelay: number = 200) {
  const spinner = requireElement<HTMLDivElement>(".app-loading");
  return {
    async wrap<T>(task: () => T | Promise<T>, delay = showDelay): Promise<T> {
      const showTimer = setTimeout(() => {
        spinner.hidden = false;
      }, delay);
      try {
        return typeof task === "function" ? await task() : task;
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

function createTemplateCloner<T extends Element>(
  template: keyof TemplateRegistry,
  fn: (node: Node | null) => node is T,
) {
  let cachedNode: T | null = null;
  return function getClone(): T {
    if (!cachedNode) {
      const { [template]: templateElement } = useTemplates(template);
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

export {
  createGlobalSpinner,
  createIconButton,
  createInfoSpan,
  createTemplateCloner,
  createTooltipContent,
  isDiv,
  requireElement,
  setActiveItem,
};
