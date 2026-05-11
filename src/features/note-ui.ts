import { deleteNote } from "@/api/noteAPI";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import { addOneNoteToList } from "@/components/sidebar/sidebar-actions";
import { stateStore } from "@/features/app-state";
import { handleImportFile } from "@/features/import-actions";
import { handleCreateNote, handleSaveNote } from "@/features/note-actions";
import { setupAutoSave, stopAutoSave } from "@/features/note-auto-save";
import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import type { Note } from "@shared/schemas/note-schema";
import type { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

type ImportedContent = {
  content: string;
  extension: "md" | "html" | "json" | "txt";
};

const cleanup = new WeakMap<
  Editor,
  { flush: () => Promise<void>; cancel: () => void }
>();

async function createNoteButton() {
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

async function importNoteButton() {
  const response = await handleCreateNote();
  if (!response.success) {
    showToast(response.message);
    return;
  }
  const note = response.data;
  const imported = await handleImportFile();
  if (!imported.success) {
    showToast("Import cancelled.");
    await deleteNote(response.data.id);
    return;
  }
  stateStore.setState({ activeId: note.id });
  addOneNoteToList(note);
  handleEditorEmptyState();
  viewNote(note, imported as ImportedContent); // use result pattern to avoid having to use type assertion
  await handleSaveNote(note.id, true);
  showToast("Note imported.");
}

function resetEditorHistory(editor: Editor) {
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
}

function viewNote(note: Note, imported?: ImportedContent): void {
  const editor = getAppItem("editor");
  stopAutoSave(editor, "flush");
  handleEditorEmptyState();
  if (imported) {
    switch (imported.extension) {
      case "md":
        editor.commands.setContent(imported.content, {
          contentType: "markdown",
          emitUpdate: false,
        });
        break;
      case "html":
        editor.commands.setContent(imported.content, {
          contentType: "html",
          emitUpdate: false,
        });
        break;
      case "txt":
        editor.commands.setContent(imported.content, {
          emitUpdate: false,
        });
        break;
      case "json":
        editor.commands.setContent(imported.content, {
          emitUpdate: false,
        });
        break;
    }
  } else {
    editor.commands.setContent(note.content, {
      emitUpdate: false,
    });
  }
  resetEditorHistory(editor);
  editor.commands.focus();
  const newCleanup = setupAutoSave(editor, note.id);
  cleanup.set(editor, newCleanup);
}

export { cleanup, createNoteButton, importNoteButton, viewNote };
