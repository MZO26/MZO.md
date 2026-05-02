import { formatShortcut } from "@/utils/helpers";
import type { Action, ActionMap, BubbleMenuGroup } from "@shared/types";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

const BUBBLE_MENU_GROUPS: BubbleMenuGroup[] = [
  "text",
  "inlineCode",
  "codeBlock",
  "table",
];

function createButton(key: string, item: Action): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.dataset["action"] = key;
  const i = document.createElement("i");
  i.dataset["lucide"] = item.icon;
  btn.appendChild(i);
  const tooltipContainer = document.createElement("span");
  tooltipContainer.textContent = key;
  const shortcutText = formatShortcut(item.shortcut);
  if (shortcutText) {
    const kbd = document.createElement("kbd");
    kbd.className = "tippy-shortcut";
    kbd.textContent = shortcutText;
    tooltipContainer.appendChild(kbd);
  }
  tippy(btn, {
    content: tooltipContainer,
    placement: "auto",
    arrow: true,
    animation: "fade",
    theme: "app-theme",
  });
  return btn;
}

function createDivider(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "divider";
  return el;
}

function createToolbarFragment(
  actions: ActionMap,
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

function createBubbleMenuFragment(
  actions: ActionMap,
  buttonMap: Map<string, HTMLButtonElement>,
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const menuMap = new Map<BubbleMenuGroup, HTMLDivElement>();
  for (const menu of BUBBLE_MENU_GROUPS) {
    const div = document.createElement("div");
    div.className = `tool-group ${menu}-tools`;
    fragment.appendChild(div);
    menuMap.set(menu, div);
  }
  let currentGroup: BubbleMenuGroup = "text";
  for (const [key, item] of Object.entries(actions)) {
    if (item.type === "divider") {
      menuMap.get(currentGroup)!.appendChild(createDivider());
    } else {
      currentGroup = item.group ?? "text";
      const actionBtn = createButton(key, item);
      menuMap.get(currentGroup)!.appendChild(actionBtn);
      buttonMap.set(key, actionBtn);
    }
  }
  return fragment;
}

export { createBubbleMenuFragment, createToolbarFragment };
