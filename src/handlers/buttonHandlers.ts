import { editor } from "../components/editor/editor";
import { handleEditorEmptyState } from "../components/editor/editorHandlers";
import {
  addOneNoteToList,
  handleSidebarEmptyState,
} from "../components/sidebar/sidebarNotes";
import { createNote, deleteNote } from "../features/notes/noteAPI";
import { viewNote } from "../features/notes/noteHandlers";
import { getValue, removeValue, StorageKeys } from "../utils/cache";
import { createNotePayload } from "../utils/factory";
import { getElement, setActiveItem } from "../utils/helpers";
import { showToast } from "../utils/toast";

async function addNoteBtnHandler() {
  const container = getElement(".notes-container");
  const activeID = getValue(StorageKeys.NOTE_ID);
  if (activeID) removeValue(StorageKeys.NOTE_ID);
  const payload = createNotePayload();
  const response = await createNote(payload);
  showToast("New note created!");
  if (!response.success) {
    showToast(response.message);
    return;
  }
  if (editor) {
    const noteElement = addOneNoteToList(response.data);
    handleEditorEmptyState(response.data.id);
    if (noteElement) setActiveItem(noteElement, container);
    viewNote(response.data, editor);
  }
}

async function deleteBtnHandler(
  deleteBtn: HTMLButtonElement,
  container: HTMLDivElement,
) {
  const noteElement = deleteBtn.closest<HTMLDivElement>(".noteItem");
  const id = noteElement?.dataset["id"];
  if (!id) return;
  const response = await deleteNote(id);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  deleteBtn.disabled = true;
  noteElement.remove();
  const noteID = getValue(StorageKeys.NOTE_ID);
  if (noteID === id) {
    removeValue(StorageKeys.NOTE_ID);
    editor?.commands.clearContent();
  }
  handleSidebarEmptyState(container);
  handleEditorEmptyState();
}

function closeModal() {
  const overlay = getElement<HTMLDivElement>(".overlay");
  const modal = getElement<HTMLDivElement>(".modal");
  overlay.classList.remove("show");
  modal.classList.remove("show");
}

export { addNoteBtnHandler, closeModal, deleteBtnHandler };
