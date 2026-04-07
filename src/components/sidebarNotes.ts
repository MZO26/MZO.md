import {
  deleteNote,
  getNoteById,
  renderNote,
  viewNote,
} from "../handlers/noteHandlers";
import { setSavedItemId } from "../shared/sharedStates";
import type { Note } from "../shared/types";
import { getElement, setActiveItem, truncate } from "../utils/helpers";
import { editor } from "./editor";

async function initializeContainer(): Promise<void> {
  const container = getElement<HTMLDivElement>(".notes-container");
  if (!container) return;
  container.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;

    const deleteBtn = target.closest(".delete-btn") as HTMLButtonElement;
    if (deleteBtn) {
      const noteElement = deleteBtn.closest(".noteItem") as HTMLDivElement;
      const noteId = noteElement.dataset["id"];
      if (!noteId) return;
      await deleteNote(noteId, noteElement);
      return;
    }
    const noteItem = target.closest(".noteItem") as HTMLDivElement;
    if (noteItem) {
      const noteId = noteItem.dataset["id"];
      if (!noteId) return;
      setSavedItemId(noteId);
      const note = await getNoteById(noteId);
      console.log("Note fetched by ID: ", note);
      console.log("Editor instance: ", editor);
      if (note && editor) {
        await viewNote(note, editor);
        setActiveItem(noteItem);
        return;
      }
    }
  });
}

function addNoteToList(note: Note): void {
  const container = getElement<HTMLDivElement>(".notes-container");
  const noteElement = renderNote(note);
  console.log("Adding note to list: ", note);
  if (noteElement) {
    container.prepend(noteElement);
    setActiveItem(noteElement);
  }
}

function updateNoteInList(
  id: string,
  newTitle: string,
  newTags: string[] = [],
): void {
  const noteElement = getElement<HTMLDivElement>(`.noteItem[data-id="${id}"]`);
  if (!noteElement) {
    console.warn(`Note element with ID ${id} not found for update.`);
    return;
  }
  const titleElement = noteElement.querySelector(
    ".note-title",
  ) as HTMLDivElement;
  const tagContainer = noteElement.querySelector(
    ".note-tags",
  ) as HTMLDivElement;
  const truncatedTitle = truncate(newTitle, 20);
  const limitedTags = newTags.slice(0, 3);
  document.startViewTransition(() => {
    tagContainer.innerHTML = "";
    limitedTags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.classList.add("tag");
      tagElement.textContent = `#${tag}`;
      tagContainer.appendChild(tagElement);
    });
    titleElement.textContent = truncatedTitle;
  });
}

function removeNoteFromList(id: string) {
  const noteElement = getElement<HTMLDivElement>(`.noteItem[data-id="${id}"]`);
  noteElement.remove();
}

export {
  addNoteToList,
  initializeContainer,
  removeNoteFromList,
  updateNoteInList,
};
