import { handleZoom } from "@/api/api";
import { setSelectionMode } from "@/components/sidebar/sidebar-selection";
import { stateStore } from "@/settings/app-state";
import { findElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";

function isFocusActive() {
  return getAppItem("appContainer").classList.contains("focus");
}

function isSelectionActive() {
  return stateStore.get("selectionMode") === true;
}

function isEditorFocused(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el?.closest(".ProseMirror");
}

function initGlobalShortcuts() {
  window.addEventListener("keydown", (e) => {
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
      document.dispatchEvent(new CustomEvent("app:toggle-toolbar"));
      return;
    }
    if (isMod && key === "o") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-sidebar"));
      return;
    }
    if (isMod && key === "w") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:set-editor-width"));
      return;
    }
    if (isMod && key === "g") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:open-global-search"));
      return;
    }
    if (isMod && key === ",") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:open-settings"));
      return;
    }
    if (isMod && key === "n") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:create-new-note"));
      return;
    }
    if (key === "F11") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-focus-mode"));
      return;
    }
    if (e.shiftKey && e.key === "s") {
      if (isEditorFocused(e.target)) return;
      e.preventDefault();
      setSelectionMode(!isSelectionActive());
      return;
    }
    if (isSelectionActive() && key === "Backspace") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:delete-selected"));
      return;
    }
    if (isSelectionActive() && isMod && key === "a") {
      if (isEditorFocused(e.target)) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:select-all-visible"));
      return;
    }
    if (key === "Escape") {
      const target = e.target as HTMLElement | null;
      const openDialog = findElement("dialog[open]");
      if (target?.closest("dialog") || openDialog) {
        return;
      }
      if (isSelectionActive()) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("app:exit-selection-mode"));
        return;
      }
      if (isFocusActive()) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("app:exit-focus-mode"));
        return;
      }
    }
  });
}

export { initGlobalShortcuts };
