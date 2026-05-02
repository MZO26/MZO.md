import { bookmark, createNote, deleteNote, pin } from "@/api/noteAPI";
import { editor } from "@/components/editor/editor";
import { handleEditorEmptyState } from "@/components/editor/editorEmptyState";
import {
  addOneNoteToList,
  handleSidebarEmptyState,
  reloadNoteList,
} from "@/components/sidebar/sidebarNotes";
import { viewNote } from "@/handlers/noteHandlers";
import { getNoteId, setNoteId } from "@/services/state";
import { getElement, setActiveItem } from "@/utils/helpers";
import { showToast } from "@/utils/toast";
import { getMetadata } from "@shared/generators/generators";
import type { CreateNotePayload } from "@shared/schemas/noteSchema";

async function createNewNote() {
  const editorContent = {
    content: { type: "doc" as const, content: [{ type: "paragraph" }] },
    plainText: "",
  };
  const metadata = getMetadata(editorContent.content, editorContent.plainText);
  const payload: CreateNotePayload = { ...editorContent, ...metadata };
  return await createNote(payload);
}

async function addNoteBtnHandler() {
  const container = getElement<HTMLDivElement>(".notes-container");
  const response = await createNewNote();
  if (!response.success) {
    showToast(response.message);
    return;
  }
  const note = response.data;
  setNoteId(note.id);
  showToast("New note created");
  if (editor) {
    const noteElement = addOneNoteToList(note, container);
    if (noteElement) setActiveItem(noteElement, container);
    handleEditorEmptyState(note.id);
    viewNote(note, editor);
  }
}

export const pendingDeletions = new Set<string>();

async function executeNoteDeletion(id: string, noteElement: HTMLDivElement) {
  pendingDeletions.add(id);
  const response = await deleteNote(id);
  if (!response.success) {
    pendingDeletions.delete(id);
    showToast(response.message);
    return;
  }
  showToast("Note deleted");
  noteElement.remove();
  handleSidebarEmptyState();
  const noteID = getNoteId();
  if (noteID === id) {
    setNoteId(null);
    editor?.commands.clearContent();
    handleEditorEmptyState();
  }
  setTimeout(() => pendingDeletions.delete(id), 1000);
}

const unsubscribeDelete = window.noteAPI.onTriggerDelete(async (id: string) => {
  const noteElement = document.querySelector<HTMLDivElement>(
    `.noteItem[data-id="${id}"]`,
  );
  if (!noteElement) return;
  await executeNoteDeletion(id, noteElement);
});

const unsubscribePin = window.noteAPI.onTriggerPin(async (id: string) => {
  const response = await pin(id);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  response.data === true
    ? showToast("Pinned note")
    : showToast("Unpinned note");
  await reloadNoteList();
});

const unsubscribeBookmark = window.noteAPI.onTriggerBookmark(
  async (id: string) => {
    const response = await bookmark(id);
    if (!response.success) {
      showToast(response.message);
      return;
    }
    response.data === true
      ? showToast("Bookmarked note")
      : showToast("Removed bookmark");
    await reloadNoteList();
  },
);

window.addEventListener("beforeunload", () => {
  unsubscribePin();
  unsubscribeDelete();
  unsubscribeBookmark();
});

function setModalState(show: boolean): void {
  const overlay = getElement<HTMLDivElement>(".overlay");
  const modal = getElement<HTMLDivElement>(".modal");
  overlay.classList.toggle("show", show);
  modal.classList.toggle("show", show);
}

export { addNoteBtnHandler, setModalState };
