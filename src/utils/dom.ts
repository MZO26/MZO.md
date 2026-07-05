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

function setActiveItem(element: HTMLElement, parent: HTMLElement) {
  if (!element) return;
  const currentlyActive = parent.querySelector(".is-active");
  if (currentlyActive) {
    currentlyActive.classList.remove("is-active");
  }
  element.classList.add("is-active");
}

function createIconButton(
  icon: string,
  tooltip?: string,
  shortcut?: string,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  const i = document.createElement("i");
  i.setAttribute("data-lucide", icon);
  btn.appendChild(i);
  btn.type = "button";
  tooltip && btn.setAttribute("data-tippy-content", tooltip);
  shortcut && btn.setAttribute("data-shortcut", shortcut);
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

export {
  createIconButton,
  createInfoSpan,
  findElement,
  requireElement,
  setActiveItem,
};
