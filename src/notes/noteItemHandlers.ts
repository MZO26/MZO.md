import type { Note } from "../shared/types";
import { getElement } from "../utils/helpers";
import { renderNote } from "./renderNotes";

function addNoteToList(note: Note): void {
  const container = getElement<HTMLDivElement>(".notes-container");
  const noteElement = renderNote(note);
  if (noteElement && container) {
    container.prepend(noteElement);
  }
}

function updateNoteInList(id: string, newTitle: string): void {
  const titleElement = getElement<HTMLDivElement>(
    `.noteItem[data-id="${id}"]`,
  ).querySelector(".note-title");
  if (titleElement) {
    titleElement.textContent = newTitle;
  }
}

function removeNoteFromList(id: string) {
  const noteElement = getElement<HTMLDivElement>(`.noteItem[data-id="${id}"]`);
  if (noteElement) {
    noteElement.remove();
  }
}

export { addNoteToList, removeNoteFromList, updateNoteInList };
