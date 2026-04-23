import type { Editor } from "@tiptap/core";
import { getElement } from "../../utils/helpers";
import { showEditorEmptyState } from "./editorEmptyState";

function extractNoteDataFromEditor(editor: Editor) {
  const plainText = editor.getText();
  const content = editor.getJSON();
  return { content, plainText };
}

function handleEditorEmptyState(ID?: string | undefined | null) {
  const editorContainer = getElement(".editor-container");
  const editorView = getElement(".editor-view");
  if (!editorContainer || !editorView) {
    console.warn("(editorHandler): Editor UI elements not found.");
    return;
  }
  const emptyState = editorContainer.querySelector(".editor-empty-state");
  // if no note id: show empty state of editor view
  if (!ID) {
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

export { extractNoteDataFromEditor, handleEditorEmptyState };
