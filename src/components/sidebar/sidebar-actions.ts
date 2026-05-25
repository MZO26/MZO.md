import { getAll, getByTag, getViews, searchNotes } from "@/api/api";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import { createNoteItem } from "@/components/sidebar/sidebar-items";
import {
  handleSidebarEmptyState,
  setSidebarState,
} from "@/components/sidebar/sidebar-state";
import { noteStore, stateStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { findElement, requireElement, setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS } from "@shared/constants";
import type { Note } from "@shared/schemas/note-schema";
import type { ViewItem } from "@shared/types";

async function handleSearchInput(searchInput: string) {
  const sidebar = getAppItem("sidebar");
  sidebar.replaceChildren();
  if (searchInput === "") {
    await reloadNoteList();
    return;
  }
  const result = await searchNotes(searchInput, 50);
  if (!result.success) {
    console.error("[searchNotes]: Search failed:", result.error);
    return;
  }
  addManyNotesToList(result.data);
  handleSidebarEmptyState(searchInput);
}

const debouncedSearch = debounce((e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = target.value.trim();
  void handleSearchInput(value);
}, DEBOUNCE_MS.fast);

function createViews(views: ViewItem[]) {
  const select = requireElement<HTMLSelectElement>(".view-select");
  for (const view of views) {
    const option = document.createElement("option");
    option.textContent = view["label"];
    option.value = view["id"];
    select.append(option);
  }
  return select;
}

async function handleViews(view: string) {
  const result = await getViews(view);
  if (!result.success) {
    console.error("[handleViews]: Failed to fetch views:", result.error);
    return;
  }
  await reloadNoteList(result.data);
}

async function searchByTag(tag: string) {
  const result = await getByTag(tag);
  if (!result.success) {
    console.error("[searchByTag]: Failed to fetch notes by tag:", result.error);
    return;
  }
  await reloadNoteList(result.data);
}

function toggleSidebar(appContainer: HTMLDivElement) {
  const collapsed = appContainer.classList.contains("collapsed");
  setSidebarState(appContainer, !collapsed);
}

function updateNoteCount(notes: Note[]) {
  const noteCount = findElement<HTMLSpanElement>(".note-count");
  if (!noteCount) return;
  const count = notes.length;
  noteCount.textContent = `${count} ${count === 1 ? "note" : "notes"}`;
}

function getNotePriority(note: Note) {
  if (note.pinned && note.bookmarked) return 0;
  if (note.pinned) return 1; // highest priority
  if (note.bookmarked) return 2; // middle
  return 3; // normal
}

// this function returns a number by which note items are being displayed in the sidebar. If it returns a negative number, a comes first, then b
function compareNotes(a: Note, b: Note) {
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
    const element = child as HTMLElement;
    if (
      element.getAttribute("data-pinned") !== "true" &&
      element.getAttribute("data-bookmarked") !== "true"
    ) {
      target = element;
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
    const { activeId } = stateStore.getState();
    if (!activeId) return;
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${activeId}"]`,
    );
    if (noteElement) setActiveItem(noteElement, sidebar);
  });
}

async function reloadNoteList(notes?: Note[]) {
  const sidebar = getAppItem("sidebar");
  sidebar.replaceChildren();
  if (notes) {
    addManyNotesToList(notes.sort(compareNotes));
    noteStore.setState({ notes });
    return;
  }
  const result = await getAll();
  if (!result.success) {
    console.error("[getAll]: Failed to fetch all notes:", result.error);
    return;
  } else {
    const notes = result.data;
    addManyNotesToList(notes.sort(compareNotes));
    noteStore.setState({ notes });
  }
}

async function updateNoteInList(note: Note) {
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
  createViews,
  debouncedSearch,
  handleSearchInput,
  handleViews,
  reloadNoteList,
  searchByTag,
  toggleSidebar,
  updateNoteCount,
  updateNoteInList,
};
