import { handleZoom } from "@/api/api";
import { stateStore } from "@/state/state";
import { appEvents } from "@shared/event-emitter";
import { APP_EVENTS } from "@shared/shared-constants";

function isFocusActive() {
  return stateStore.get("focus") === true;
}

function isSelectionActive() {
  return stateStore.get("selectionMode") === true;
}

function isEditorFocused(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return;
  return !!target.closest(".ProseMirror");
}

function initGlobalShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    const { key, ctrlKey, metaKey } = e;
    const isMod = ctrlKey || metaKey;
    if (isMod && (key === "+" || key === "=")) {
      e.preventDefault();
      handleZoom("in");
      return;
    }
    if (isMod && key === "-") {
      e.preventDefault();
      handleZoom("out");
      return;
    }
    if (isMod && key === "0") {
      e.preventDefault();
      handleZoom("reset");
      return;
    }
    if (isMod && key === ".") {
      e.preventDefault();
      appEvents.emit(APP_EVENTS.TOGGLE_TOOLBAR);
      return;
    }
    if (isMod && key === "o") {
      e.preventDefault();
      appEvents.emit(APP_EVENTS.TOGGLE_SIDEBAR);
      return;
    }
    if (isMod && key === "w") {
      e.preventDefault();
      appEvents.emit(APP_EVENTS.SET_EDITOR_WIDTH);
      return;
    }
    if (isMod && key === "g") {
      e.preventDefault();
      appEvents.emit(APP_EVENTS.FOCUS_GLOBAL_SEARCH);
      return;
    }
    if (isMod && key === ",") {
      e.preventDefault();
      appEvents.emit(APP_EVENTS.OPEN_SETTINGS);
      return;
    }
    if (isMod && key === "n") {
      e.preventDefault();
      appEvents.emitAsync(APP_EVENTS.CREATE_NEW_NOTE);
      return;
    }
    if (key === "F11") {
      e.preventDefault();
      appEvents.emit(APP_EVENTS.TOGGLE_FOCUS_MODE);
      return;
    }
    if (isMod && e.key === "s") {
      if (isEditorFocused(e.target)) return;
      e.preventDefault();
      appEvents.emit(APP_EVENTS.SET_SELECTION_MODE);
      return;
    }
    if (isSelectionActive() && key === "Backspace") {
      if (isEditorFocused(e.target)) return;
      e.preventDefault();
      appEvents.emitAsync(APP_EVENTS.DELETE_SELECTED);
      return;
    }
    if (isSelectionActive() && isMod && key === "a") {
      if (isEditorFocused(e.target)) return;
      e.preventDefault();
      appEvents.emit(APP_EVENTS.SELECT_ALL_VISIBLE);
      return;
    }
    if (key === "Escape") {
      if (!(e.target instanceof HTMLElement)) return;
      const openDialog =
        document.querySelector<HTMLDialogElement>("dialog[open]");
      if (e.target.closest("dialog") || openDialog) {
        return;
      }
      if (isSelectionActive()) {
        e.preventDefault();
        appEvents.emit(APP_EVENTS.EXIT_SELECTION_MODE);
        return;
      }
      if (isFocusActive()) {
        e.preventDefault();
        appEvents.emit(APP_EVENTS.TOGGLE_FOCUS_MODE);
        return;
      }
    }
  });
}

export {
  initGlobalShortcuts,
  isEditorFocused,
  isFocusActive,
  isSelectionActive,
};
