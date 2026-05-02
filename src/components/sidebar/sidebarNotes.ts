import { getAll } from "@/api/noteAPI";
import { getSettings, setSettings } from "@/api/settingsAPI";
import { editor } from "@/components/editor/editor";
import { handleEditorEmptyState } from "@/components/editor/editorEmptyState";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebarEmptyState";
import { noteItemHandler } from "@/handlers/noteHandlers";
import { setNoteId } from "@/services/state";
import { formatNoteDate } from "@/utils/date";
import { createAsyncHandler, getElement } from "@/utils/helpers";
import { createContextMenu, createNoteItem } from "@/utils/templates";
import { showToast } from "@/utils/toast";
import type { Note } from "@shared/schemas/noteSchema";
import type { NoteItemElements } from "@shared/types";

async function initNotesSidebar() {
  const response = await getSettings("collapsed-state");
  const collapsed = response.success ? response.data === true : false;
  const appContainer = getElement(".app-container");
  if (collapsed) {
    appContainer.classList.add("sidebar-collapsed");
  } else appContainer.classList.remove("sidebar-collapsed");
  void appContainer.offsetWidth;
  appContainer.classList.remove("no-transition");
  const container = getElement<HTMLDivElement>(".notes-container");
  container.addEventListener(
    "click",
    createAsyncHandler(async (event) => {
      const target = event.target as HTMLElement;
      // early return if clicking the container background
      if (target === container) return;
      const actionBtn = target.closest<HTMLButtonElement>("button");
      if (actionBtn) {
        event.preventDefault();
        event.stopPropagation();
        await createContextMenu(event);
        return;
      }
      const noteItem = target.closest<HTMLDivElement>(".noteItem");
      if (noteItem && editor) {
        await noteItemHandler(noteItem, container, editor);
        return;
      }
    }),
  );
}

async function collapseSidebar(): Promise<void> {
  const appContainer = getElement<HTMLDivElement>(".app-container");
  const currentState = appContainer.classList.contains("sidebar-collapsed");
  const newState = !currentState;
  appContainer.classList.toggle("sidebar-collapsed", newState);
  await setSettings({ "collapsed-state": newState });
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
  setNoteId(note.id);
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
  handleSidebarEmptyState();
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
