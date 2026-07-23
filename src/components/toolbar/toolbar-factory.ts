import { createIconButton } from "@/components/sidebar/sidebar-features";
import { settingsStore } from "@/settings/app-state";
import { getAppItem } from "@/utils/registry";
import type { Action, ActionMap, ToolbarItem } from "@shared/types";
import type { Editor } from "@tiptap/core";

let cachedActions: ReturnType<typeof getActions> | null = null;

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

function createToolbarFragment(actions: ActionMap) {
  const buttonMap = new Map<string, HTMLButtonElement>();
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
  return { fragment, buttonMap };
}

function isAction(item: ToolbarItem): item is Action {
  return item.type !== "divider";
}

function getActions(actions: ActionMap): [string, Action][] {
  return (cachedActions ??= Object.entries(actions).filter(
    (entry): entry is [string, Action] => isAction(entry[1]),
  ));
}

function updateActiveStates(
  buttonElements: Map<string, HTMLButtonElement>,
  actions: ActionMap,
  editor: Editor,
): void {
  const actionEntries = getActions(actions);
  for (const [key, item] of actionEntries) {
    const btn = buttonElements.get(key);
    if (!btn) continue;
    const isActive = item.isActive?.(editor) ?? false;
    const isDisabled = item.isDisabled?.(editor) ?? false;
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
  const { fragment, buttonMap } = createToolbarFragment(actions);
  container.appendChild(fragment);
  function refresh(): void {
    if (settingsStore.get("toolbar_collapsed") === true) return;
    updateActiveStates(buttonMap, actions, editor);
  }
  refresh();
  editor.on("transaction", ({ transaction }) => {
    if (!transaction.docChanged && !transaction.selectionSet) return;
    refresh();
  });
  return { refresh };
}

function buildTopToolbarMenu(container: HTMLDivElement, actions: ActionMap) {
  container.replaceChildren();
  const { fragment, buttonMap } = createToolbarFragment(actions);
  container.appendChild(fragment);
  return buttonMap;
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
  updateActiveStates,
};
