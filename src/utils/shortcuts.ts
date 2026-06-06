import { handleZoom } from "@/api/api";
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
    "$mod+Alt+S": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:check-sync-state"));
    },
    "$mod+Shift+T": (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("app:toggle-toolbar"));
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
  });
}

export { initGlobalShortcuts };
