import { getCommandState } from "@/components/editor/editor-commands";
import { localStore } from "@/state/state";
import { useCore } from "@/utils/registry";
import type {
  Action,
  ActionMap,
  ActiveStateParams,
  ToolbarItem,
} from "@/utils/types";
import { createIconButton } from "@/utils/ui";
import { appEvents } from "@shared/event-emitter";
import { APP_EVENTS } from "@shared/shared-constants";

let cachedActions: [string, Action][] | null = null;
let buttonMap = new Map<string, HTMLButtonElement>();

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
    if ("type" in item && item.type === "divider") {
      fragment.appendChild(createDivider());
    } else {
      if (!item || !isAction(item)) continue;
      const actionBtn = createButton(key, item);
      fragment.appendChild(actionBtn);
      buttonMap.set(key, actionBtn);
    }
  }
  return { fragment, buttonMap };
}

function getActions(actions: ActionMap): [string, Action][] {
  return (cachedActions ??= Object.entries(actions).filter(
    (entry): entry is [string, Action] => isAction(entry[1]),
  ));
}

function isAction(item: ToolbarItem): item is Action {
  return !("type" in item && item.type === "divider") && "action" in item;
}

function updateActiveStates(params: ActiveStateParams): void {
  const { buttonElements, actions, editor } = params;
  const actionEntries = getActions(actions);
  for (const [key, item] of actionEntries) {
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
}

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
  appEvents.on(APP_EVENTS.TOGGLE_TOOLBAR, async () => {
    localStore.setState((state) => ({
      ...state,
      toolbarCollapsed: !state.toolbarCollapsed,
    }));
  });
}

function buildTopToolbarMenu(container: HTMLDivElement, actions: ActionMap) {
  container.replaceChildren();
  const { fragment, buttonMap } = createToolbarFragment(actions);
  container.appendChild(fragment);
  return buttonMap;
}

function setupToolbarListeners(container: HTMLDivElement, actions: ActionMap) {
  container.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const btn = e.target.closest<HTMLButtonElement>("[data-action]");
    const key = btn?.getAttribute("data-action");
    if (!key) return;
    const item = actions[key];
    if (!item || !isAction(item)) return;
    appEvents.emit(item.action);
  });
}

export {
  buildToolbarMenu,
  buildTopToolbarMenu,
  buttonMap,
  cachedActions,
  createDivider,
  setupToolbarListeners,
  updateActiveStates,
};
