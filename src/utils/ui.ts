import { showContextMenu } from "@/api/electronAPI";
import { formatShortcut } from "@/utils/format";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Partial<HTMLElementTagNameMap[K]>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = Object.assign(document.createElement(tag), props);
  element.append(...children);
  return element;
}

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

export { createContextMenu, createTooltipContent, el };
