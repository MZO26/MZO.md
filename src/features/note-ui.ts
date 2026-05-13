import { createManyNotes } from "@/api/noteAPI";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import {
  addManyNotesToList,
  addOneNoteToList,
} from "@/components/sidebar/sidebar-actions";
import {
  getImportedContent,
  handleImportFile,
} from "@/features/import-actions";
import { handleCreateNote } from "@/features/note-actions";
import { setupAutoSave, stopAutoSave } from "@/features/note-auto-save";
import { stateStore } from "@/settings/app-state";
import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import type { Note } from "@shared/schemas/note-schema";
import { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

const cleanup = new WeakMap<
  Editor,
  { flush: () => Promise<void>; cancel: () => void }
>();

async function createNoteButton(): Promise<void> {
  const response = await handleCreateNote();
  if (!response.success) {
    showToast(response.message);
    return;
  }
  const note = response.data;
  stateStore.setState({ activeId: note.id });
  showToast("New note created");
  addOneNoteToList(note);
  handleEditorEmptyState();
  viewNote(note);
}

async function importNoteButton(): Promise<void> {
  const imported = await handleImportFile();
  if (!imported.success) {
    showToast("Failed to import files");
    return;
  }
  const files = await getImportedContent(imported.notes);
  const response = await createManyNotes(files);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  addManyNotesToList(response.data);
  handleEditorEmptyState();
}

function resetEditorHistory(editor: Editor): void {
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
}

function viewNote(note: Note): void {
  const editor = getAppItem("editor");
  stopAutoSave(editor, "flush");
  handleEditorEmptyState();
  editor.commands.setContent(note.content, {
    emitUpdate: false,
  });
  resetEditorHistory(editor);
  editor.commands.focus();
  const newCleanup = setupAutoSave(editor, note.id);
  cleanup.set(editor, newCleanup);
}

export { cleanup, createNoteButton, importNoteButton, viewNote };
