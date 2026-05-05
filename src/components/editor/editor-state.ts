import { getNoteId } from "@/services/state";
import { el, getElement } from "@/utils/helpers";
import { createElement, FileQuestion } from "lucide";

function handleEditorEmptyState() {
  const editorContainer = getElement(".editor-container");
  const editorView = getElement(".editor-view");
  const emptyState = editorContainer.querySelector(".editor-empty-state");
  const id = getNoteId();
  if (!id) {
    editorView.classList.add("hidden");
    if (!emptyState) {
      const newEmptyState = showEditorEmptyState();
      editorContainer.appendChild(newEmptyState);
    }
  } else {
    editorView.classList.remove("hidden");
    if (emptyState) {
      emptyState.remove();
    }
  }
}

function showEditorEmptyState() {
  const iconSvg = createElement(FileQuestion);
  iconSvg.classList.add("empty-state-icon");
  return el(
    "div",
    { className: "editor-empty-state", inert: true },
    el(
      "div",
      { className: "empty-state-content" },
      el("div", { className: "empty-state-icon" }, iconSvg),
      el("h2", { className: "empty-state-title" }, "No note selected"),
      el(
        "p",
        { className: "empty-state-description" },
        "Create a new note by clicking the ",
        el("strong", {}, "+"),
        " button,",
        el("br"),
        " or select an existing note from the sidebar.",
      ),
    ),
  );
}

export { handleEditorEmptyState };
