import { TOOLBAR_ACTIONS } from "@/components/toolbar/toolbar-actions";
import {
  buildToolbarMenu,
  setupToolbarListeners,
  updateActiveStates,
} from "@/components/toolbar/toolbar-factory";
import { localStore, stateStore } from "@/state/state";
import { requireElement } from "@/utils/ui";
import { appEvents } from "@shared/event-emitter";
import { APP_EVENTS } from "@shared/shared-constants";

function initToolbar(editorContainer: HTMLDivElement) {
  const toolbarContainer = requireElement<HTMLDivElement>(
    "#toolbar",
    editorContainer,
  );
  buildToolbarMenu(toolbarContainer, TOOLBAR_ACTIONS);
  const unsubListeners = setupToolbarListeners(
    toolbarContainer,
    TOOLBAR_ACTIONS,
  );
  const unsubAppEvents = appEvents.onMany({
    [APP_EVENTS.TOGGLE_TOOLBAR]: () => {
      updateActiveStates.cancel();
      localStore.setState((state) => ({
        ...state,
        toolbarCollapsed: !state.toolbarCollapsed,
      }));
    },
    [APP_EVENTS.TOGGLE_FOCUS_MODE]: () => {
      stateStore.setState((state) => ({
        ...state,
        focus: !state.focus,
      }));
    },
  });
  return function unsubscribe() {
    unsubListeners();
    unsubAppEvents();
  };
}

export { initToolbar };
