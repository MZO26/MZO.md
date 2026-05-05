import { setTheme } from "@/api/electronAPI";
import { editor } from "@/components/editor/editor-init";
import { createAsyncHandler, registerAppEvents } from "@/utils/helpers";
import { getItem } from "@/utils/registry";
import type { Theme } from "@shared/schemas/store-schema";

async function initFocusMode() {
  const appContainer = getItem("appContainer");
  const newState = !appContainer.classList.contains("focus");
  appContainer.classList.toggle("focus", newState);
  await setTheme(document.body.dataset["theme"] as Theme, newState);
  console.log("setting theme");
}

function setEditorWidth(editorWrapper: HTMLDivElement) {
  const widths = ["comfortable", "normal", "wide"];
  const current = editorWrapper.dataset["width"] || "normal";
  const index = widths.indexOf(current as (typeof widths)[number]);
  const next = widths[(index + 1) % widths.length];
  editorWrapper.dataset["width"] = next;
}

function initHoverbar() {
  const appContainer = getItem("appContainer");
  const editorWrapper = getItem("editorWrapper");
  registerAppEvents(document, {
    "app:set-editor-width": () => setEditorWidth(editorWrapper),
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
