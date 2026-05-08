import { handleZoom } from "@/api/electronAPI";
import { tinykeys } from "tinykeys";

function initGlobalShortcuts() {
  tinykeys(window, {
    "$mod++": async (e) => {
      e.preventDefault();
      await handleZoom("in");
    },
    "$mod+=": async (e) => {
      e.preventDefault();
      await handleZoom("in");
    },
    "$mod+-": async (e) => {
      e.preventDefault();
      await handleZoom("out");
    },
    "$mod+0": async (e) => {
      e.preventDefault();
      await handleZoom("reset");
    },
    "$mod+o": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-sidebar"));
    },
    "$mod+Shift+R": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-read-only"));
    },
    "$mod+Shift+W": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:set-editor-width"));
    },
    "$mod+f": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:open-global-search"));
    },
    "$mod+Shift+V": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-view-filter"));
    },
    "$mod+Alt+O": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-info-sidebar"));
    },
    "$mod+,": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:open-settings"));
    },
    "$mod+n": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:create-new-note"));
    },
    F11: (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-focus-mode"));
    },
    Escape: (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:escape"));
    },
  });
}

export { initGlobalShortcuts };
