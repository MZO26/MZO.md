import { getAll } from "@/api/noteAPI";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { getNoteId, setNoteId } from "@/services/state";
import { formatNoteDate } from "@/utils/date";
import { getElement, setActiveItem } from "@/utils/helpers";
import { createNoteItem } from "@/utils/templates";
import { showToast } from "@/utils/toast";
import type { Note } from "@shared/schemas/note-schema";
import type { NoteItemElements } from "@shared/types";

function getNotePriority(note: Note): number {
  if (note.pinned && note.bookmarked) return 0;
  if (note.pinned) return 1; // highest priority
  if (note.bookmarked) return 2; // middle
  return 3; // normal
}

// this function returns a number by which note items are being displayed in the sidebar. If it returns a negative number, a comes first, then b
function compareNotes(a: Note, b: Note): number {
  const priorityDiff = getNotePriority(a) - getNotePriority(b); // example: pinned note a (1) - regular note b(3) = -2, which means a comes before b
  if (priorityDiff !== 0) return priorityDiff;
  // if priorities are equal, they get sorted by updated_at
  return b.updated_at > a.updated_at ? 1 : -1;
}

function addOneNoteToList(note: Note, container: HTMLDivElement) {
  const noteElement = createNoteItem(note);
  let target: Element | null = null;
  for (const child of container.children) {
    const el = child as HTMLElement;
    if (
      el.dataset["pinned"] !== "true" &&
      el.dataset["bookmarked"] !== "true"
    ) {
      target = el;
      break;
    }
  }
  if (target) {
    container.insertBefore(noteElement, target);
  } else {
    container.appendChild(noteElement);
  }
  handleSidebarEmptyState(container);
  setNoteId(note.id);
  setActiveItem(noteElement, container);
}

function addManyNotesToList(notes: Note[], container: HTMLDivElement) {
  const fragment = document.createDocumentFragment();
  notes.forEach((note: Note) => {
    const noteElement = createNoteItem(note);
    if (noteElement) {
      fragment.appendChild(noteElement);
    }
  });
  container.appendChild(fragment);
  handleEditorEmptyState();
  handleSidebarEmptyState();
  const id = getNoteId();
  if (!id) return;
  const noteElement = getElement<HTMLDivElement>(`.noteItem[data-id="${id}"]`);
  setActiveItem(noteElement, container);
}

async function reloadNoteList(notes?: Note[]): Promise<void> {
  const container = getElement<HTMLDivElement>(".notes-container");
  if (!container) return;
  container.innerHTML = "";
  if (notes) {
    addManyNotesToList(notes.sort(compareNotes), container);
    return;
  }
  const response = await getAll();
  response.success
    ? addManyNotesToList(response.data.sort(compareNotes), container)
    : showToast(response.message);
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
  const dateContainer = noteElement.querySelector<HTMLDivElement>(".note-date");
  updateTransition({ snippetContainer, titleContainer, dateContainer }, note);
}

function updateTransition(containers: NoteItemElements, note: Note) {
  const { snippetContainer, dateContainer, titleContainer } = containers;

  if (!snippetContainer || !dateContainer || !titleContainer) {
    console.warn("Missing elements, skipping transition.");
    return;
  }
  document.startViewTransition(() => {
    snippetContainer.textContent = note.snippet;
    dateContainer.textContent = formatNoteDate(note.updated_at);
    titleContainer.textContent = note.title;
  });
}

export {
  addManyNotesToList,
  addOneNoteToList,
  reloadNoteList,
  updateNoteInList,
};
