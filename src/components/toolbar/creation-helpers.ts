import { createTooltipContent } from "@/utils/ui";
import type { Action, ActionMap } from "@shared/types";
import tippy from "tippy.js";

function createButton<T>(key: string, item: Action<T>): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.classList.add(`${key}-btn`);
  btn.dataset["action"] = key;
  const i = document.createElement("i");
  i.dataset["lucide"] = item.icon;
  btn.appendChild(i);
  const tooltipContent = createTooltipContent(key, item.shortcut);
  tippy(btn, {
    content: tooltipContent,
    placement: "top",
    arrow: true,
    theme: "app-theme",
  });
  return btn;
}

function createDivider(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "divider";
  return el;
}

function createToolbarFragment<T>(
  actions: ActionMap<T>,
  buttonMap: Map<string, HTMLButtonElement>,
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const [key, item] of Object.entries(actions)) {
    if (item.type === "divider") {
      fragment.appendChild(createDivider());
    } else {
      const actionBtn = createButton(key, item);
      fragment.appendChild(actionBtn);
      buttonMap.set(key, actionBtn);
    }
  }
  return fragment;
}

export { createButton, createToolbarFragment };
