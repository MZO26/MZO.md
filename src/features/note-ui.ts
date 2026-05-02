import { handleEditorEmptyState } from "@/components/editor/editor-state";
import { addOneNoteToList } from "@/components/sidebar/sidebar-actions";
import { handleCreateNote } from "@/features/note-actions";
import { setupAutoSave, stopAutoSave } from "@/services/auto-save";
import { getEditor, setNoteId } from "@/services/state";
import { getElement } from "@/utils/helpers";
import { showToast } from "@/utils/toast";
import type { Note } from "@shared/schemas/note-schema";
import type { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

async function createNoteButton() {
  const container = getElement<HTMLDivElement>(".notes-container");
  const response = await handleCreateNote();
  if (!response.success) {
    showToast(response.message);
    return;
  }
  const note = response.data;
  setNoteId(note.id);
  showToast("New note created");
  addOneNoteToList(note, container);
  handleEditorEmptyState();
  viewNote(note);
}

function resetEditorHistory(editor: Editor) {
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
}

export const cleanup = new WeakMap<
  Editor,
  { flush: () => void; cancel: () => void }
>();

function viewNote(note: Note): void {
  const editor = getEditor();
  stopAutoSave(editor, "flush");
  handleEditorEmptyState();
  editor.commands.setContent(note.content, { emitUpdate: false });
  resetEditorHistory(editor);
  editor.commands.focus();
  const newCleanup = setupAutoSave(editor, note.id);
  cleanup.set(editor, newCleanup);
}

export { createNoteButton, viewNote };
