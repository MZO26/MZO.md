import { createToolbarFragment } from "@/components/toolbar/creation-helpers";
import { renderIcons } from "@/utils/icons";
import { getAppItem } from "@/utils/registry";
import { createTooltipContent } from "@/utils/ui";
import type { ActionMap } from "@shared/types";
import type { Editor } from "@tiptap/core";
import { delegate } from "tippy.js";

function updateActiveStates(
  buttonElements: Map<string, HTMLButtonElement>,
  actions: ActionMap,
  editor: Editor,
): void {
  for (const [key, item] of Object.entries(actions)) {
    if (item.type === "divider") return;
    const btn = buttonElements.get(key);
    if (!btn) return;
    btn.classList.toggle("is-active", item.isActive?.(editor) ?? false);
    btn.disabled = item.isDisabled?.(editor) ?? false;
  }
}

function buildMenu(container: HTMLDivElement, actions: ActionMap): void {
  const editor = getAppItem("editor");
  container.innerHTML = "";
  const buttonMap = new Map<string, HTMLButtonElement>();
  const fragment = createToolbarFragment(actions, buttonMap);
  container.appendChild(fragment);
  renderIcons(container);
  delegate(container, {
    target: "[data-tippy-content]",
    theme: "app-theme",
    trigger: "mouseenter",
    onCreate: (instance) => {
      const reference = instance.reference;
      if (reference.hasAttribute("data-shortcut")) {
        const baseText = reference.getAttribute("data-tippy-content") || "";
        const shortcut = reference.getAttribute("data-shortcut") ?? undefined;
        instance.setContent(createTooltipContent(baseText, shortcut));
      }
    },
  });
  editor.on("transaction", () => {
    updateActiveStates(buttonMap, actions, editor);
  });
  updateActiveStates(buttonMap, actions, editor);
}

function setupToolbarListeners(container: HTMLDivElement, actions: ActionMap) {
  const editor = getAppItem("editor");
  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-action]",
    );
    const key = btn?.dataset["action"] as keyof typeof actions;
    const item = actions[key];
    if (item && "run" in item) {
      item.run(editor);
    }
  });
}

export { buildMenu, setupToolbarListeners };
