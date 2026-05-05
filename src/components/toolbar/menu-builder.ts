import { createToolbarFragment } from "@/components/toolbar/creation-helpers";
import { renderIcons } from "@/utils/icons";
import { getItem } from "@/utils/registry";
import type { ActionMap } from "@shared/types";
import type { Editor } from "@tiptap/core";

function updateActiveStates<T>(
  buttonElements: Map<string, HTMLButtonElement>,
  actions: ActionMap<T>,
  editor: Editor,
): void {
  Object.entries(actions).forEach(([key, item]) => {
    if (item.type === "divider") return;
    const btn = buttonElements.get(key);
    if (!btn) return;
    btn.classList.toggle("is-active", item.isActive?.(editor as T) ?? false);
    btn.disabled = item.isDisabled?.(editor as T) ?? false;
  });
}

function buildMenu<T>(container: HTMLElement, actions: ActionMap<T>): void {
  const editor = getItem("editor");
  container.innerHTML = "";
  const buttonMap = new Map<string, HTMLButtonElement>();
  const fragment = createToolbarFragment(actions, buttonMap);
  container.appendChild(fragment);
  renderIcons(container);
  editor.on("transaction", () => {
    updateActiveStates(buttonMap, actions, editor);
  });
  updateActiveStates(buttonMap, actions, editor);
}

function setupToolbarListeners<T>(
  container: HTMLElement,
  actions: ActionMap<T>,
) {
  const editor = getItem("editor");
  container.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>(
      "[data-action]",
    );
    const key = btn?.dataset["action"] as keyof typeof actions;
    const item = actions[key];
    if (item && "run" in item) {
      item.run(editor as T);
    }
  });
}

export { buildMenu, setupToolbarListeners };
