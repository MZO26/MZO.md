import { setTheme } from "@/api/api";
import { editor } from "@/components/editor/editor-init";
import { createAsyncHandler } from "@/utils/async";
import { getAppItem, registerAppEvents } from "@/utils/registry";
import type { Theme } from "@shared/schemas/store-schema";

async function initFocusMode() {
  const appContainer = getAppItem("appContainer");
  const newState = !appContainer.classList.contains("focus");
  requestAnimationFrame(() => {
    appContainer.classList.toggle("focus", newState);
    // doesn't get awaited to animation is smooth. Gets pushed to the background while focus class is being applied
    setTheme(document.body.dataset["theme"] as Theme, newState).catch((err) => {
      console.error("Failed to sync theme with main process.", err);
    });
  });
}

function setEditorWidth(container: HTMLDivElement) {
  const widths = ["comfortable", "normal", "wide"];
  const current = container.dataset["width"] || "normal";
  const index = widths.indexOf(current as (typeof widths)[number]);
  const next = widths[(index + 1) % widths.length];
  container.dataset["width"] = next;
}

function initHoverbar() {
  const appContainer = getAppItem("appContainer");
  registerAppEvents(document, {
    "app:set-editor-width": () => setEditorWidth(appContainer),
    "app:toggle-read-only": () => editor?.setEditable(!editor.isEditable),
    "app:toggle-focus-mode": createAsyncHandler(initFocusMode),
    "app:escape": () => {
      if (appContainer.classList.contains("focus")) {
        initFocusMode();
      }
    },
  });
}

export { initFocusMode, initHoverbar, setEditorWidth };
