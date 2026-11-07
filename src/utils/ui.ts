import { useTemplates, type TemplateRegistry } from "@/utils/registry";
import type { AppIcons } from "@/utils/types";

/**
 * Queries the first element matching `selector` under `parent`, or throws if none exists.
 *
 * A convenience wrapper around `querySelector` that replaces the `T | null`
 * return with a guaranteed `T`, making downstream code null-free.
 *
 * @template T The expected concrete element type (e.g. `HTMLInputElement`).
 * @param selector CSS selector to match.
 * @param [parent=document] Scope to search within.
 * @returns The first matching element, typed as `T`.
 * @throws {Error} If no element matches the selector.
 *
 * @example
 * const input = requireElement<HTMLInputElement>("#note-title");
 * input.value; // no null check needed
 */

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

/**
 * Moves the `.is-active` class from the current item to `element` within `parent`.
 *
 * Removes `.is-active` from any existing child of `parent`, then applies it
 * to `element`. No-op if `element` is `null`.
 *
 * @param element – The item to activate, or `null` to skip.
 * @param parent – Container that owns the active-item group (e.g. a list or tab bar).
 *
 * @example
 * setActiveItem(liElement, ulContainer); // li is now .is-active, previous one isn't
 */

function setActiveItem(element: HTMLElement | null, parent: HTMLElement) {
  if (!element) return;
  const currentlyActive = parent.querySelector(".is-active");
  if (currentlyActive) {
    currentlyActive.classList.remove("is-active");
  }
  element.classList.add("is-active");
}

/**
 * Creates an icon-only `<button type="button">` with a Lucide icon.
 *
 * Builds a button containing an `<i data-lucide="…">` element. If `tooltip`
 * is provided, it is formatted into Title Case via {@link createTooltipContent}
 * (e.g. `"deleteNote"` → `"Delete Note"`) and set as the button's `title`.
 *
 * @param icon – The Lucide icon name (e.g. `"trash-2"`, `"copy"`).
 * @param [tooltip] – Optional tooltip text; auto-formatted via {@link createTooltipContent} before assignment.
 * @returns The configured `<button>` element (not yet attached to the DOM).
 *
 * @example
 * const del = createIconButton("trash-2", "deleteNote"); // title → "Delete Note"
 * container.append(del);
 */

function createIconButton(icon: AppIcons, tooltip?: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  const i = document.createElement("i");
  i.setAttribute("data-lucide", icon);
  btn.appendChild(i);
  if (tooltip) btn.title = createTooltipContent(tooltip);
  return btn;
}

/**
 * Creates a styled `<span>` for informational text.
 *
 * Always applies the base class `info-span`; an additional `className` is
 * appended if provided. Content is set via `textContent` (no HTML injection).
 *
 * @param textContent – The visible text.
 * @param [className] – Extra class name(s) appended after `info-span`.
 * @returns The configured `<span>` element (not yet attached to the DOM).
 *
 * @example
 * const badge = createInfoSpan("3 links", "link-count");
 * // <span class="info-span link-count">3 links</span>
 */

function createInfoSpan(
  textContent: string,
  className?: string,
): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `info-span ${className}`;
  span.textContent = textContent;
  return span;
}

/**
 * Formats a camelCase / PascalCase identifier into human-readable Title Case.
 *
 * Inserts spaces at letter→uppercase and letter→digit boundaries, then
 * capitalizes the first character. Intended for converting code-style names
 * (e.g. icon keys, data attributes) into display text.
 *
 * @param baseText – The raw identifier or label to format.
 * @returns The formatted string.
 *
 * @example
 * createTooltipContent("deleteNote");    // "Delete Note"
 * createTooltipContent("copyLink2");     // "Copy Link 2"
 * createTooltipContent("pin");           // "Pin"
 */

function createTooltipContent(baseText: string) {
  return baseText
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

/**
 * Creates a global loading-spinner controller with a configurable show-delay.
 *
 * Resolves the `.app-loading` element once (throws via {@link requireElement}
 * if it does not exist). Returns a `wrap` helper that shows the spinner only
 * if the wrapped task exceeds the delay – fast operations never flash it.
 *
 * The spinner is hidden again in a `finally` block, so it is cleaned up even
 * when the task throws.
 *
 * @param [showDelay=200] Default threshold in ms before the spinner appears.
 * @returns An object exposing `wrap`.
 *
 * @example
 * const { wrap } = createGlobalSpinner(); // 200 ms default
 *
 * // Async task – spinner shows only if > 200 ms
 * const note = await wrap(() => fetchNote("note-abc123"));
 *
 * // Custom delay per call
 * const data = await wrap(() => heavyComputation(), 500);
 *
 * // Sync value passes through untouched (no spinner at all)
 * const x = await wrap(42);
 */

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

/**
 * Creates a lazy factory that returns a fresh deep-clone of a registered template per call.
 *
 * Resolves and caches the template's first child on first invocation; every
 * call (including the first) returns an independent `cloneNode(true)`.
 * The type guard `fn` validates at cache time and narrows to `T`.
 *
 * @template T Expected element type of the template child.
 * @param template Key into `TemplateRegistry`.
 * @param fn Type guard for runtime validation + TS narrowing.
 * @returns Zero-arg function returning a fresh `T` per call.
 * @throws If the template is missing, not an `<template>`, or fails the guard.
 *
 * @example
 * const getRow = createTemplateCloner<HTMLTableRowElement>(
 *   "note-list-row",
 *   (n): n is HTMLTableRowElement => n instanceof HTMLTableRowElement,
 * );
 * const row1 = getRow(); // resolves + caches
 * const row2 = getRow(); // just clones – row1 !== row2
 */

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
  isDiv,
  requireElement,
  setActiveItem,
};
