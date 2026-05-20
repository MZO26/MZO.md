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
import { handleCreateNote, viewNote } from "@/features/note-actions";
import { noteStore, stateStore } from "@/settings/app-state";
import { showToast } from "@/utils/toast";

async function createNoteButton(): Promise<void> {
  const response = await handleCreateNote();
  if (!response.success) {
    showToast(response.message);
    return;
  }
  const note = response.data;
  noteStore.setState((state) => ({
    notes: [...state.notes, note],
  }));
  stateStore.setState({ activeId: note.id });
  showToast("New note created");
  addOneNoteToList(note);
  handleEditorEmptyState();
  viewNote(note);
}

async function importNoteButton(): Promise<void> {
  const imported = await handleImportFile();
  if (!imported.success) {
    showToast(imported.message);
    return;
  }
  const content = await getImportedContent(imported.data);
  if (!content.success) {
    showToast(content.message);
    return;
  }
  const response = await createManyNotes(content.data);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  noteStore.setState((state) => ({
    notes: [...state.notes, ...response.data],
  }));
  addManyNotesToList(response.data);
  handleEditorEmptyState();
}

export { createNoteButton, importNoteButton };
