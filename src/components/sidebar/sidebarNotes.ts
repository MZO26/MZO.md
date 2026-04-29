import type { Note } from "../../../shared/schemas/noteSchema";
import type { NoteItemElements } from "../../../shared/types";
import { getAll } from "../../features/notes/noteAPI";
import { noteItemHandler } from "../../features/notes/noteHandlers";
import { deleteBtnHandler } from "../../handlers/buttonHandlers";
import { getValue, setValue, StorageKeys } from "../../utils/cache";
import { formatNoteDate, getElement } from "../../utils/helpers";
import { createNoteItem } from "../../utils/templates";
import { showToast } from "../../utils/toast";
import { editor } from "../editor/editor";
import { handleEditorEmptyState } from "../editor/editorHandlers";
import { handleSidebarEmptyState } from "./sidebarEmptyState";

function initNotesSidebar() {
  const appContainer = getElement(".app-container");
  void appContainer.offsetWidth;
  appContainer.classList.remove("no-transition");
  const storedValue = getValue(StorageKeys.SIDEBAR_COLLAPSED);
  const isCollapsed = storedValue === true;
  appContainer.classList.toggle("sidebar-collapsed", isCollapsed);
  const container = getElement<HTMLDivElement>(".notes-container");
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

function collapseSidebar(): void {
  const appContainer = getElement<HTMLDivElement>(".app-container");
  const frameLeft = getElement(".frame-left");
  const currentState = appContainer.classList.contains("sidebar-collapsed");
  const editorContainer = getElement(".editor-container");
  const newState = !currentState;
  appContainer.classList.toggle("sidebar-collapsed", newState);
  frameLeft.classList.toggle("sidebar-collapsed", newState);
  editorContainer.classList.toggle("sidebar-collapsed", newState);
  setValue(StorageKeys.SIDEBAR_COLLAPSED, newState);
}

function addOneNoteToList(
  note: Note,
  container: HTMLDivElement,
): HTMLDivElement {
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
  setValue(StorageKeys.NOTE_ID, note.id);
  return noteElement;
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

export {
  addManyNotesToList,
  addOneNoteToList,
  collapseSidebar,
  handleSidebarEmptyState,
  initNotesSidebar,
  reloadNoteList,
  updateNoteInList,
};
