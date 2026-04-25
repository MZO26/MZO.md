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
  const currentState = appContainer.classList.contains("sidebar-collapsed");
  const newState = !currentState;
  appContainer.classList.toggle("sidebar-collapsed", newState);
  setValue(StorageKeys.SIDEBAR_COLLAPSED, newState);
}

function addOneNoteToList(note: Note) {
  const container = getElement<HTMLDivElement>(".notes-container");
  const noteElement = createNoteItem(note);
  container.prepend(noteElement);
  handleSidebarEmptyState(container);
  setValue(StorageKeys.NOTE_ID, note.id);
  return noteElement;
}

function addManyNotesToList(notes: Note[]) {
  const fragment = document.createDocumentFragment();
  const container = getElement<HTMLDivElement>(".notes-container");
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

async function reloadNoteList(): Promise<void> {
  const container = getElement<HTMLDivElement>(".notes-container");
  if (!container) return;
  container.innerHTML = "";
  try {
    const response = await getAll();
    if (!response.success) {
      showToast(response.message);
      return;
    }
    addManyNotesToList(response.data);
  } catch (error) {
    console.error("Error loading notes:", error);
    return;
  }
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
