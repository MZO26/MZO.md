import type { Editor } from "@tiptap/core";
import { EditorDocSchema } from "../../../shared/schemas/editorSchema";
import { PlainTextSchema } from "../../../shared/schemas/noteSchema";
import { getValue, setValue, StorageKeys } from "../../utils/cache";
import { getElement } from "../../utils/helpers";
import { showEditorEmptyState } from "./editorEmptyState";
import { setupZoomBar } from "./editorFooter";
import { setupToolbar } from "./editorHeader";

function initEditorHandlers(editor: Editor) {
  setupToolbar(editor);
  setupZoomBar();
}

function extractNoteDataFromEditor(editor: Editor | null) {
  const plainText = PlainTextSchema.parse(editor?.getText());
  const content = EditorDocSchema.parse(editor?.getJSON());
  return { content, plainText };
}

class PositionManager {
  private savedPositions = getValue(StorageKeys.EDITOR_POS);
  private activeNoteId = getValue(StorageKeys.NOTE_ID);

  save(editor: Editor) {
    if (!this.activeNoteId || !editor) return;
    const { from, to } = editor.state.selection;
    this.savedPositions[this.activeNoteId] = from === to ? from : { from, to };
    setValue(StorageKeys.EDITOR_POS, this.savedPositions);
  }

  restore(editor: Editor, noteId: string) {
    const position = this.savedPositions[noteId];

    if (position !== undefined) {
      editor.chain().focus().setTextSelection(position).scrollIntoView().run();
    } else {
      editor.chain().focus("end").run();
    }

    this.activeNoteId = noteId;
    setValue(StorageKeys.NOTE_ID, this.activeNoteId);
  }
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

export {
  extractNoteDataFromEditor,
  handleEditorEmptyState,
  initEditorHandlers,
  PositionManager,
};
