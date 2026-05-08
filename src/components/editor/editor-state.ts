import { getNoteId } from "@/features/note-state";
import { requireElement } from "@/utils/dom";
import { el } from "@/utils/ui";
import { createElement, FileQuestion } from "lucide";

const EMPTY_STATE = showEditorEmptyState(); // cached because it never changes dynamically

function handleEditorEmptyState() {
  const editorContainer = requireElement(".editor-container");
  const editorView = requireElement(".editor-view");
  const emptyState = editorContainer.querySelector(".editor-empty-state");
  const id = getNoteId();
  if (!id) {
    editorView.classList.add("hidden");
    if (!emptyState) {
      editorContainer.appendChild(EMPTY_STATE);
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
