import { getAll } from "@/api/noteAPI";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import { createNoteItem } from "@/components/sidebar/sidebar-items";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { noteStore, stateStore } from "@/settings/app-state";
import { findElement, setActiveItem } from "@/utils/dom";
import { formatNoteDate } from "@/utils/format";
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
  return b.updated_at > a.updated_at ? 1 : -1;
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
  if (target) {
    sidebar.insertBefore(noteElement, target);
  } else {
    sidebar.appendChild(noteElement);
  }
  handleSidebarEmptyState();
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
  sidebar.appendChild(fragment);
  handleEditorEmptyState();
  handleSidebarEmptyState();
  const { activeId } = stateStore.getState();
  if (!activeId) return;
  const noteElement = findElement<HTMLDivElement>(
    `.noteItem[data-id="${activeId}"]`,
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

function updateNoteInList(note: Note): void {
  const noteElement = findElement<HTMLDivElement>(
    `.noteItem[data-id="${note.id}"]`,
  );
  if (!noteElement) {
    console.warn("Note Element not found.");
    return;
  }
  const titleContainer =
    noteElement.querySelector<HTMLDivElement>(".note-title");
  const snippetContainer =
    noteElement.querySelector<HTMLDivElement>(".note-content");
  const dateContainer = noteElement.querySelector<HTMLDivElement>(".note-date");
  const tagContainer = noteElement.querySelector<HTMLDivElement>(".note-tags");
  const transition = document.startViewTransition(() => {
    if (titleContainer) titleContainer.textContent = note.title;
    if (snippetContainer) snippetContainer.textContent = note.snippet;
    if (tagContainer) {
      if (note.tags && note.tags.length > 0) {
        tagContainer.innerHTML = "";
        for (const tag of note.tags) {
          const span = document.createElement("span");
          span.classList.add("tag", "searchTag");
          span.dataset["tag"] = String(tag);
          span.textContent = `#${tag}`;
          tagContainer!.append(span);
        }
      }
    }
    if (dateContainer)
      dateContainer.textContent = formatNoteDate(note.updated_at);
  });
  transition.finished.catch((error: Error) => {
    if (error.name === "AbortError") {
      return;
    }
  });
}

export {
  addManyNotesToList,
  addOneNoteToList,
  reloadNoteList,
  updateNoteCount,
  updateNoteInList,
};
