import { getAppItem } from "@/utils/registry";
import type { Action, ActionMap } from "@shared/types";
import type { Editor } from "@tiptap/core";
import { createIconButton } from "../sidebar/sidebar-features";

function createButton(key: string, item: Action) {
  const btn = createIconButton(item.icon, key, item.shortcut);
  btn.classList.add(`${key}-btn`);
  btn.setAttribute("data-action", key);
  return btn;
}

function createDivider() {
  const element = document.createElement("div");
  element.className = "divider";
  return element;
}

function createToolbarFragment(
  actions: ActionMap,
  buttonMap: Map<string, HTMLButtonElement>,
) {
  const fragment = document.createDocumentFragment();
  for (const [key, item] of Object.entries(actions)) {
    if (item.type === "divider") {
      fragment.appendChild(createDivider());
    } else {
      if (!item) continue;
      const actionBtn = createButton(key, item);
      fragment.appendChild(actionBtn);
      buttonMap.set(key, actionBtn);
    }
  }
  return fragment;
}

function updateActiveStates(
  buttonElements: Map<string, HTMLButtonElement>,
  actions: ActionMap,
  editor: Editor,
): void {
  for (const [key, item] of Object.entries(actions)) {
    if (item.type === "divider") continue;
    const btn = buttonElements.get(key);
    if (!btn) continue;
    const isActive = item?.isActive?.(editor) ?? false;
    const isDisabled = item?.isDisabled?.(editor) ?? false;
    if (btn.classList.contains("is-active") !== isActive) {
      btn.classList.toggle("is-active", isActive);
    }
    if (btn.disabled !== isDisabled) {
      btn.disabled = isDisabled;
    }
  }
}

function buildToolbarMenu(container: HTMLDivElement, actions: ActionMap) {
  const editor = getAppItem("editor");
  container.replaceChildren();
  const buttonMap = new Map<string, HTMLButtonElement>();
  const fragment = createToolbarFragment(actions, buttonMap);
  container.appendChild(fragment);
  updateActiveStates(buttonMap, actions, editor);
  editor.on("transaction", ({ transaction }) => {
    if (!transaction.docChanged && !transaction.selectionSet) {
      return;
    }
    updateActiveStates(buttonMap, actions, editor);
  });
}

function buildTopToolbarMenu(container: HTMLDivElement, actions: ActionMap) {
  container.replaceChildren();
  const buttonMap = new Map<string, HTMLButtonElement>();
  const fragment = createToolbarFragment(actions, buttonMap);
  container.appendChild(fragment);
}

function setupToolbarListeners(container: HTMLDivElement, actions: ActionMap) {
  const editor = getAppItem("editor");
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest<HTMLButtonElement>("[data-action]");
    const key = btn?.getAttribute("data-action") as keyof typeof actions;
    const item = actions[key];
    if (item && "run" in item) {
      item.run(editor);
    }
  });
}

export {
  buildToolbarMenu,
  buildTopToolbarMenu,
  createDivider,
  setupToolbarListeners,
};
