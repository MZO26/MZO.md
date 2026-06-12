import { handleZoom } from "@/api/api";

function initGlobalShortcuts() {
  window.addEventListener("keydown", (e) => {
    const { key, ctrlKey, metaKey, altKey, shiftKey } = e;
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
    if (isMod && altKey && key === "S") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:check-sync-state"));
      return;
    }
    if (isMod && shiftKey && key === "T") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-toolbar"));
      return;
    }
    if (isMod && key === "o") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-sidebar"));
      return;
    }
    if (isMod && shiftKey && key === "R") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-read-only"));
      return;
    }
    if (isMod && shiftKey && key === "W") {
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
  });
}

export { initGlobalShortcuts };
