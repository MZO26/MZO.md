import { BubbleMenuActions } from "@/components/toolbar/bubble-menu-actions";
import {
  createBubbleMenuFragment,
  createToolbarFragment,
} from "@/components/toolbar/creation-helpers";
import { ToolbarActions } from "@/components/toolbar/toolbar-actions";
import { renderIcons } from "@/utils/icons";
import type { ActionMap } from "@shared/types";
import type { Editor } from "@tiptap/core";

function getActiveMenu(editor: Editor): string {
  if (editor.isActive("table")) return "table";
  if (editor.isActive("codeBlock")) return "codeBlock";
  if (editor.isActive("code")) return "inlineCode";
  return "text";
}

function updateActiveStates(
  buttonElements: Map<string, HTMLButtonElement>,
  actions: ActionMap,
  editor: Editor,
): void {
  Object.entries(actions).forEach(([key, item]) => {
    if (item.type === "divider") return;
    const btn = buttonElements.get(key);
    if (!btn) return;
    btn.classList.toggle("is-active", item.isActive?.(editor) ?? false);
    btn.disabled = item.isDisabled?.(editor) ?? false;
  });
}

function buildMenu(
  container: HTMLElement,
  editor: Editor,
  type: "toolbar" | "bubble-menu",
): void {
  let actions = type === "toolbar" ? ToolbarActions : BubbleMenuActions;
  const buttonMap = new Map<string, HTMLButtonElement>();
  const fragment =
    type === "toolbar"
      ? createToolbarFragment(actions, buttonMap)
      : createBubbleMenuFragment(actions, buttonMap);
  container.appendChild(fragment);
  renderIcons(container);
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target === container) return;
    const btn = target.closest<HTMLButtonElement>("[data-action]");
    if (!btn) return;
    const actionKey = btn.dataset["action"];
    if (!actionKey) return;
    const action = actions[actionKey];
    if (action && action.type !== "divider") action.run(editor);
  });
  if (type === "bubble-menu") {
    editor.on("selectionUpdate", () => {
      const activeMenu = getActiveMenu(editor);
      container.dataset["activeMenu"] = activeMenu || "text";
    });
  }
  editor.on("transaction", () => {
    updateActiveStates(buttonMap, actions, editor);
  });
  updateActiveStates(buttonMap, actions, editor);
}

export { buildMenu };
