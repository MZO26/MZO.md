import {
  TOOLBAR_ACTIONS,
  TOP_TOOLBAR_ACTIONS,
} from "@/components/toolbar/toolbar-actions-init";
import {
  buildToolbarMenu,
  buildTopToolbarMenu,
  setupToolbarListeners,
} from "@/components/toolbar/toolbar-factory";
import {
  setEditorWidth,
  setWindowTop,
} from "@/components/toolbar/toolbar-features";
import { handleUpdateSettings } from "@/settings/setting-actions";
import { settingsStore, stateStore } from "@/state/state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getAppItem, registerAppEvents } from "@/utils/registry";
import { isFocusActive } from "@/utils/shortcuts";

function initToolbar() {
  const toolbarContainer = requireElement<HTMLDivElement>("#toolbar");
  buildToolbarMenu(toolbarContainer, TOOLBAR_ACTIONS);
  setupToolbarListeners(toolbarContainer, TOOLBAR_ACTIONS);
}

function initTopToolbar() {
  const appContainer = getAppItem("appContainer");
  const appPinBtn = requireElement<HTMLButtonElement>(".app-pin-btn");
  const topToolbar = requireElement<HTMLDivElement>(".top-toolbar");
  buildTopToolbarMenu(topToolbar, TOP_TOOLBAR_ACTIONS);
  setupToolbarListeners(topToolbar, TOP_TOOLBAR_ACTIONS);
  appPinBtn.addEventListener(
    "click",
    createAsyncHandler(async () => await setWindowTop(appPinBtn)),
  );
  registerAppEvents(document, {
    "app:set-editor-width": () => setEditorWidth(appContainer),
    "app:toggle-focus-mode": () => {
      const newState = !isFocusActive();
      stateStore.setState({ focus: newState });
    },
    "app:toggle-toolbar": async () => {
      const newState = !settingsStore.get("toolbar_collapsed");
      await handleUpdateSettings({ toolbar_collapsed: newState });
    },
  });
}

export { initToolbar, initTopToolbar };
