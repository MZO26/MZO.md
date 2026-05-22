import { getAll } from "@/api/noteAPI";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import { createNoteItem } from "@/components/sidebar/sidebar-items";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { noteStore, stateStore } from "@/settings/app-state";
import { findElement, setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import type { Note } from "@shared/schemas/note-schema";

function updateNoteCount(notes: Note[]) {
  const noteCount = findElement<HTMLSpanElement>(".note-count");
  if (!noteCount) return;
  const count = notes.length;
  noteCount.textContent = `${count} ${count === 1 ? "note" : "notes"}`;
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
  return String(b.updated_at).localeCompare(String(a.updated_at));
}

function addOneNoteToList(note: Note) {
  const noteElement = createNoteItem(note);
  let target: Element | null = null;
  const sidebar = getAppItem("sidebar");
  for (const child of sidebar.children) {
    const el = child as HTMLElement;
    if (
      el.getAttribute("data-pinned") !== "true" &&
      el.getAttribute("data-bookmarked") !== "true"
    ) {
      target = el;
      break;
    }
  }
  requestAnimationFrame(() => {
    if (target && sidebar.contains(target)) {
      sidebar.insertBefore(noteElement, target);
    } else {
      sidebar.appendChild(noteElement);
    }
    handleSidebarEmptyState();
  });
  stateStore.setState({ activeId: note.id });
  setActiveItem(noteElement, sidebar);
}

function addManyNotesToList(notes: Note[]) {
  const sidebar = getAppItem("sidebar");
  const fragment = document.createDocumentFragment();
  for (const note of notes) {
    const noteElement = createNoteItem(note);
    if (noteElement) {
      fragment.appendChild(noteElement);
    }
  }
  requestAnimationFrame(() => {
    sidebar.appendChild(fragment);
    handleEditorEmptyState();
    handleSidebarEmptyState();
  });
  const { activeId } = stateStore.getState();
  if (!activeId) return;
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${activeId}"]`,
  );
  if (noteElement) setActiveItem(noteElement, sidebar);
}

async function reloadNoteList(notes?: Note[]): Promise<void> {
  const sidebar = getAppItem("sidebar");
  sidebar.innerHTML = "";
  if (notes) {
    addManyNotesToList(notes.sort(compareNotes));
    noteStore.setState({ notes });
    return;
  }
  const response = await getAll();
  if (!response.success) {
    showToast(response.message);
    return;
  } else {
    const notes = response.data;
    addManyNotesToList(notes.sort(compareNotes));
    noteStore.setState({ notes });
  }
}

async function updateNoteInList(note: Note): Promise<void> {
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${note.id}"]`,
  );
  if (!noteElement) {
    console.warn("Note Element not found.");
    return;
  }
  const wasActive = noteElement.classList.contains("is-active");
  const newElement = createNoteItem(note);
  if (wasActive) {
    setActiveItem(newElement, getAppItem("sidebar"));
  }
  noteElement.replaceWith(newElement);
}

export {
  addManyNotesToList,
  addOneNoteToList,
  reloadNoteList,
  updateNoteCount,
  updateNoteInList,
};
