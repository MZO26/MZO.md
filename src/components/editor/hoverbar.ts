import { setTheme } from "@/api/electronAPI";
import { editor } from "@/components/editor/editor";
import { createAsyncHandler, getElement } from "@/utils/helpers";
import type { Theme } from "@shared/schemas/storeSchema";

async function initFocusMode(appContainer: HTMLDivElement) {
  const newState = !appContainer.classList.contains("focus");
  appContainer.classList.toggle("focus", newState);
  await setTheme(document.body.dataset["theme"] as Theme, newState);
}

function setEditorWidth(editorElement: HTMLDivElement) {
  const widths = ["comfortable", "normal", "wide"];
  const current = editorElement.dataset["width"] || "normal";
  const index = widths.indexOf(current as (typeof widths)[number]);
  const next = widths[(index + 1) % widths.length];
  editorElement.dataset["width"] = next;
}

function initHoverbar() {
  const focusBtn = getElement(".focus-btn");
  const appContainer = getElement<HTMLDivElement>(".app-container");
  const editorEl = getElement<HTMLDivElement>("#editor");
  const readOnlyBtn = getElement(".read-only-btn");
  const editorWidthBtn = getElement(".editor-width-btn");
  focusBtn.addEventListener(
    "click",
    createAsyncHandler(async () => {
      initFocusMode(appContainer);
    }),
  );
  readOnlyBtn.addEventListener("click", () => {
    editor?.setEditable(!editor.isEditable);
  });
  editorWidthBtn.addEventListener("click", () => {
    setEditorWidth(editorEl);
  });
}

export { initHoverbar };
