import { getAll } from "../../features/notes/noteAPI";
import { noteItemHandler } from "../../features/notes/noteHandlers";
import { deleteBtnHandler } from "../../handlers/buttonHandlers";
import type { Note, NoteItemElements } from "../../shared/types";
import { setValue, StorageKeys } from "../../utils/cache";
import { formatNoteDate, getElement } from "../../utils/helpers";
import { getNoteItemUI } from "../../utils/templates";
import { showToast } from "../../utils/toast";
import { editor } from "../editor/editor";
import { handleEditorEmptyState } from "../editor/editorHandlers";
import { handleSidebarEmptyState } from "./sidebarEmptyState";

function initNotesSidebar() {
  const container = getElement<HTMLDivElement>(".notes-container");
  if (!container) return;
  container.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;

    const deleteBtn = target.closest<HTMLButtonElement>(".delete-btn");
    if (deleteBtn) {
      await deleteBtnHandler(deleteBtn, container);
      return;
    }
    const noteItem = target.closest<HTMLDivElement>(".noteItem");
    if (noteItem && editor) {
      await noteItemHandler(noteItem, container, editor);
      return;
    }
  });
}

function addOneNoteToList(note: Note): HTMLDivElement | undefined {
  const container = getElement<HTMLDivElement>(".notes-container");
  const noteElement = getNoteItemUI(note);
  if (noteElement) {
    container.prepend(noteElement);
    handleSidebarEmptyState(container);
    setValue(StorageKeys.NOTE_ID, note.id);
    return noteElement;
  }
  return undefined;
}

function addManyNotesToList(notes: Note[]): void {
  const fragment = document.createDocumentFragment();
  const container = getElement<HTMLDivElement>(".notes-container");
  notes.forEach((note: Note) => {
    const noteElement = getNoteItemUI(note);
    if (noteElement) {
      fragment.appendChild(noteElement);
    }
  });
  container.appendChild(fragment);
  handleEditorEmptyState();
  handleSidebarEmptyState(container);
}

function updateNoteInList(note: Note): void {
  const noteElement = getElement<HTMLDivElement>(
    `.noteItem[data-id="${note.id}"]`,
  );
  if (!noteElement) {
    console.warn(`Note element with ID ${note.id} not found for update.`);
    return;
  }
  const titleContainer =
    noteElement.querySelector<HTMLDivElement>(".note-title");
  const snippetContainer =
    noteElement.querySelector<HTMLDivElement>(".note-content");
  const tagContainer = noteElement.querySelector<HTMLDivElement>(".note-tags");
  const dateContainer = noteElement.querySelector<HTMLDivElement>(".note-date");
  const tags = note.tags.slice(0, 3);
  updateTransition(
    {
      containers: {
        tagContainer,
        snippetContainer,
        titleContainer,
        dateContainer,
      },
      tags: tags,
    },
    note,
  );
}

function updateTransition(data: NoteItemElements, note: Note) {
  const { tagContainer, snippetContainer, dateContainer, titleContainer } =
    data.containers;

  if (!tagContainer || !snippetContainer || !dateContainer || !titleContainer) {
    console.warn("Missing elements, skipping transition.");
    return;
  }
  document.startViewTransition(() => {
    tagContainer.innerHTML = "";
    data.tags.forEach((tagItem) => {
      const tagElement = document.createElement("span");
      tagElement.classList.add("tag");
      tagElement.textContent = `#${tagItem}`;
      tagContainer.appendChild(tagElement);
    });
    snippetContainer.textContent = note.snippet;
    dateContainer.textContent = formatNoteDate(note.updated_at);
    titleContainer.textContent = note.title;
  });
}

async function reloadNoteList(): Promise<void> {
  const container = getElement<HTMLDivElement>(".notes-container");
  if (!container) return;
  container.innerHTML = "";
  try {
    const result = await getAll();
    if (!result.success) {
      showToast(result.message);
      return;
    }
    addManyNotesToList(result.data);
  } catch (error) {
    console.error("Error loading notes:", error);
    return;
  }
}

export {
  addManyNotesToList,
  addOneNoteToList,
  handleSidebarEmptyState,
  initNotesSidebar,
  reloadNoteList,
  updateNoteInList,
};
