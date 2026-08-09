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
import { stateStore } from "@/state/state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { registerAppEvents } from "@/utils/registry";
import { isFocusActive } from "@/utils/shortcuts";
import { APP_EVENTS } from "@shared/shared-constants";

function initToolbar(editorContainer: HTMLDivElement) {
  const toolbarContainer = requireElement<HTMLDivElement>(
    "#toolbar",
    editorContainer,
  );
  buildToolbarMenu(toolbarContainer, TOOLBAR_ACTIONS);
  setupToolbarListeners(toolbarContainer, TOOLBAR_ACTIONS);
}

function initTopToolbar(appContainer: HTMLDivElement) {
  const appPinBtn = requireElement<HTMLButtonElement>(".app-pin-btn");
  const topToolbar = requireElement<HTMLDivElement>(".top-toolbar");
  buildTopToolbarMenu(topToolbar, TOP_TOOLBAR_ACTIONS);
  setupToolbarListeners(topToolbar, TOP_TOOLBAR_ACTIONS);
  appPinBtn.addEventListener(
    "click",
    createAsyncHandler(async () => await setWindowTop(appPinBtn)),
  );
  registerAppEvents(document, {
    [APP_EVENTS.SET_EDITOR_WIDTH]: () => setEditorWidth(appContainer),
    [APP_EVENTS.TOGGLE_FOCUS_MODE]: () => {
      const newState = !isFocusActive();
      stateStore.setState({ focus: newState });
    },
  });
}

export { initToolbar, initTopToolbar };
