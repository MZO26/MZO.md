import { getCommandState } from "@/components/editor/editor-commands";
import { localStore } from "@/state/state";
import { withRafSchedule } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import type {
  Action,
  ActionMap,
  ActiveStateParams,
  ToolbarItem,
} from "@/utils/types";
import { createIconButton } from "@/utils/ui";
import { appEvents } from "@shared/event-emitter";

const buttonMap = new Map<string, HTMLButtonElement>();

function createButton(key: string, item: Action) {
  const btn = createIconButton(item.icon, key);
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
  const fragment = document.createDocumentFragment();
  for (const [key, item] of Object.entries(actions)) {
    if (!isAction(item)) {
      fragment.appendChild(createDivider());
    } else {
      const actionBtn = createButton(key, item);
      fragment.appendChild(actionBtn);
      buttonMap.set(key, actionBtn);
    }
  }
  return { fragment, buttonMap };
}

function isAction(item: ToolbarItem): item is Action {
  return !("type" in item && item.type === "divider") && "action" in item;
}

const updateActiveStates = withRafSchedule(
  (params: ActiveStateParams): void => {
    const { buttonElements, actions, editor } = params;
    const valid = Object.entries(actions).reduce<[string, Action][]>(
      (acc, [key, value]) => {
        if (!isAction(value)) return acc;
        acc.push([key, value]);
        return acc;
      },
      [],
    );
    for (const [key, item] of valid) {
      const btn = buttonElements.get(key);
      if (!btn) continue;
      const { isActive, isDisabled } = getCommandState(editor, item.action);
      if (btn.classList.contains("is-active") !== isActive) {
        btn.classList.toggle("is-active", isActive);
      }
      if (btn.disabled !== isDisabled) {
        btn.disabled = isDisabled;
      }
    }
  },
);

function buildToolbarMenu(container: HTMLDivElement, actions: ActionMap) {
  const { editor } = useCore("editor");
  container.replaceChildren();
  const { fragment, buttonMap } = createToolbarFragment(actions);
  container.appendChild(fragment);
  if (localStore.get("toolbarCollapsed") === false) {
    updateActiveStates({ buttonElements: buttonMap, actions, editor });
  }
  editor.on("transaction", ({ transaction }) => {
    if (!transaction.docChanged && !transaction.selectionSet) return;
    if (localStore.get("toolbarCollapsed") === false) {
      updateActiveStates({ buttonElements: buttonMap, actions, editor });
    }
  });
}

function setupToolbarListeners(container: HTMLDivElement, actions: ActionMap) {
  const handleToolbarClick = (e: PointerEvent) => {
    if (!(e.target instanceof Element)) return;
    const btn = e.target.closest<HTMLButtonElement>("[data-action]");
    const key = btn?.getAttribute("data-action");
    if (!key) return;
    const item = actions[key];
    if (!item || !isAction(item)) return;
    appEvents.emit(item.action);
  };
  container.addEventListener("click", handleToolbarClick);
  return function unsubscribe() {
    container.removeEventListener("click", handleToolbarClick);
  };
}

export {
  buildToolbarMenu,
  buttonMap,
  setupToolbarListeners,
  updateActiveStates,
};
