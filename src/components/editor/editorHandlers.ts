import type { Editor } from "@tiptap/core";
import { getValue, setValue, StorageKeys } from "../../utils/cache";
import { getElement } from "../../utils/helpers";
import { generateSnippet } from "../../utils/templates";
import { showEditorEmptyState } from "./editorEmptyState";
import { setupZoomBar } from "./editorFooter";
import { setupToolbar } from "./editorHeader";

function initEditorHandlers(editor: Editor) {
  setupToolbar(editor);
  setupZoomBar();
  handleEditorEmptyState();
}

function extractNoteDataFromEditor(editor: Editor | null) {
  const plainText = editor?.getText() ?? "";
  const content = editor?.getJSON() ?? {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
  const snippet = generateSnippet(plainText);
  const lines = plainText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const title: string = lines[0] ?? "New note";
  const tagMatches = plainText.match(/#[\p{L}\p{N}_]+/gu);
  const tags = tagMatches
    ? Array.from(new Set(tagMatches.map((tag) => tag.slice(1))))
    : [];
  return { title, content, plainText, snippet, tags };
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
  const existingEmptyState = editorContainer?.querySelector(
    ".editor-empty-state",
  );
  if (existingEmptyState) {
    existingEmptyState.remove();
  }
  if (!ID) {
    editorView.classList.add("hidden");
    const newEmptyState = showEditorEmptyState();
    editorContainer.appendChild(newEmptyState);
  } else {
    editorView.classList.remove("hidden");
  }
}

export {
  extractNoteDataFromEditor,
  handleEditorEmptyState,
  initEditorHandlers,
  PositionManager,
};
