import { editor } from "../components/editor/editor";
import { handleEditorEmptyState } from "../components/editor/editorHandlers";
import {
  addOneNoteToList,
  handleSidebarEmptyState,
} from "../components/sidebar2/sidebarNotes";
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
  try {
    const payload = createNotePayload();
    const result = await createNote(payload);
    console.log("new note created: ", result);
    showToast("New note created!");
    if (!result.success) {
      showToast(result.message);
      return;
    }
    if (editor) {
      const noteElement = addOneNoteToList(result.data);
      handleEditorEmptyState(result.data.id);
      if (noteElement) setActiveItem(noteElement, container);
      viewNote(result.data, editor);
    }
  } catch (error) {
    console.error("(btnHandler): Failed to add a new note: ", error);
  }
}

async function deleteBtnHandler(
  deleteBtn: HTMLButtonElement,
  container: HTMLDivElement,
) {
  const noteElement = deleteBtn.closest<HTMLDivElement>(".noteItem");
  const id = noteElement?.dataset["id"];
  if (!id) return;
  try {
    const result = await deleteNote(id);
    if (!result.success) {
      showToast(result.message);
      return;
    }
    noteElement.remove();
    const noteID = getValue(StorageKeys.NOTE_ID);
    if (noteID === id) {
      removeValue(StorageKeys.NOTE_ID);
      editor?.commands.clearContent();
    }
    handleSidebarEmptyState(container);
    handleEditorEmptyState();
  } catch (error) {
    console.error("(btnHandler): Failed to delete note: ", error);
    return;
  }
}

function closeModal() {
  const overlay = getElement<HTMLDivElement>(".overlay");
  const modal = getElement<HTMLDivElement>(".modal");
  overlay.classList.remove("show");
  modal.classList.remove("show");
}

export { addNoteBtnHandler, closeModal, deleteBtnHandler };
