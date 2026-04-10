import { deleteNote, getNoteById, viewNote } from "../handlers/noteHandlers";
import type { Note } from "../shared/types";
import { setValue, StorageKeys } from "../utils/cache";
import { formatNoteDate, getElement, setActiveItem } from "../utils/helpers";
import { renderIcons } from "../utils/icons";
import { noteItemTemplate } from "../utils/templates";
import { editor } from "./editor";

async function initializeContainer(): Promise<void> {
  const container = getElement<HTMLDivElement>(".notes-container");
  if (!container) return;
  container.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;

    const deleteBtn = target.closest<HTMLButtonElement>(".delete-btn");
    if (deleteBtn) {
      const noteElement = deleteBtn.closest<HTMLDivElement>(".noteItem");
      const noteID = noteElement?.dataset["id"];
      if (!noteID) return;
      await deleteNote(noteID, noteElement);
      return;
    }
    const noteItem = target.closest<HTMLDivElement>(".noteItem");
    const noteID = noteItem?.dataset["id"];
    if (!noteID) return;
    setValue(StorageKeys.NOTE_ID, noteID);
    const note = await getNoteById(noteID);
    if (note && editor) {
      await viewNote(note, editor);
      setActiveItem(noteItem);
      return;
    }
  });
}

function getNoteItemUI(note: Note) {
  const noteElement = document.createElement("div");
  noteElement.classList.add("noteItem");
  noteElement.dataset["id"] = note.id;
  noteElement.innerHTML = noteItemTemplate(note);
  renderIcons(noteElement);
  return noteElement;
}

function addOneNoteToList(note: Note): HTMLDivElement | undefined {
  const container = getElement<HTMLDivElement>(".notes-container");
  const noteElement = getNoteItemUI(note);
  if (noteElement) {
    container.prepend(noteElement);
    const noteID = noteElement.dataset["id"];
    if (noteID) {
      setValue(StorageKeys.NOTE_ID, noteID);
    }
    setActiveItem(noteElement);
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
  const child = container.firstElementChild;
  if (child instanceof HTMLDivElement) {
    const noteID = child.dataset["id"];
    if (noteID) {
      setValue(StorageKeys.NOTE_ID, noteID);
    }
    setActiveItem(child);
  }
}

function updateNoteInList(note: Note): void {
  const noteElement = getElement<HTMLDivElement>(
    `.noteItem[data-id="${note.id}"]`,
  );
  if (!noteElement) {
    console.warn(`Note element with ID ${note.id} not found for update.`);
    return;
  }
  const titleElement = noteElement.querySelector<HTMLDivElement>(".note-title");
  const snippetElement =
    noteElement.querySelector<HTMLDivElement>(".note-content");
  const tagContainer = noteElement.querySelector<HTMLDivElement>(".note-tags");
  const dateElement = noteElement.querySelector<HTMLDivElement>(".note-date");
  const limitedTags = note.tags.slice(0, 3);
  if (!tagContainer || !dateElement || !snippetElement || !titleElement) return;
  document.startViewTransition(() => {
    tagContainer.innerHTML = "";
    limitedTags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.classList.add("tag");
      tagElement.textContent = `#${tag}`;
      tagContainer.appendChild(tagElement);
    });
    snippetElement.textContent = note.snippet;
    dateElement.textContent = formatNoteDate(note.updated_at);
    titleElement.textContent = note.title;
  });
}

function removeNoteFromList(id: string) {
  const noteElement = getElement<HTMLDivElement>(`.noteItem[data-id="${id}"]`);
  noteElement.remove();
}

export {
  addManyNotesToList,
  addOneNoteToList,
  initializeContainer,
  removeNoteFromList,
  updateNoteInList,
};
