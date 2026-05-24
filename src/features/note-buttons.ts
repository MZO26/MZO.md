import { createManyNotes, importNote, showNotification } from "@/api/api";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import {
  addManyNotesToList,
  addOneNoteToList,
} from "@/components/sidebar/sidebar-actions";
import { setImportedContent } from "@/features/import-actions";
import { handleCreateNote, viewNote } from "@/features/note-actions";
import { noteStore, stateStore } from "@/settings/app-state";

async function createNoteButton() {
  const result = await handleCreateNote();
  if (!result.success) {
    console.error("Failed to create note:", result.error);
    return;
  }
  const note = result.data;
  noteStore.setState((state) => ({
    notes: [...state.notes, note],
  }));
  stateStore.setState({ activeId: note.id });
  addOneNoteToList(note);
  handleEditorEmptyState();
  viewNote(note);
}

async function importNoteButton() {
  const imported = await importNote();
  if (!imported.success) return;
  const processedPayloads = await setImportedContent(imported.data);
  if (!processedPayloads.success) return;
  const result = await createManyNotes(processedPayloads.data);
  if (!result.success) {
    console.error("Failed to create imported notes:", result.error);
    return;
  }
  const count = imported.data.length;
  await showNotification(
    "Import Successful",
    `Successfully imported ${count} file${count === 1 ? "" : "s"}.`,
  );
  noteStore.setState((state) => ({
    notes: [...state.notes, ...result.data],
  }));
  addManyNotesToList(result.data);
  handleEditorEmptyState();
}

export { createNoteButton, importNoteButton };
