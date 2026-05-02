import emptyEditor from "@/assets/emptyEditor.svg?raw";
import { getNoteId } from "@/services/state";
import { getElement } from "@/utils/helpers";

function handleEditorEmptyState() {
  const editorContainer = getElement(".editor-container");
  const editorView = getElement(".editor-view");
  if (!editorContainer || !editorView) {
    console.warn("(editorHandler): Editor UI elements not found.");
    return;
  }
  const emptyState = editorContainer.querySelector(".editor-empty-state");
  // if no note id: show empty state of editor view
  const id = getNoteId();
  if (!id) {
    editorView.classList.add("hidden");
    // only append new empty state if it doesn't already exist
    if (!emptyState) {
      const newEmptyState = showEditorEmptyState();
      editorContainer.appendChild(newEmptyState);
    }
    // if note id: show editor view and remove empty state if it exists
  } else {
    editorView.classList.remove("hidden");
    if (emptyState) {
      emptyState.remove();
    }
  }
}

function showEditorEmptyState() {
  const emptyStateContainer = document.createElement("div");
  const p = document.createElement("p");
  p.innerHTML =
    "Create a new note by clicking + <br/> To view a note select an item in the sidebar";
  emptyStateContainer.className = "editor-empty-state";
  emptyStateContainer.innerHTML = emptyEditor;
  emptyStateContainer.appendChild(p);
  return emptyStateContainer;
}

export { handleEditorEmptyState };
