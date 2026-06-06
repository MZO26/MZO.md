import { createNoteItem } from "@/components/sidebar/sidebar-note-items";
import { noteStore, stateStore } from "@/settings/app-state";
import { findElement, requireElement, setActiveItem } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem, getTemplateItem } from "@/utils/registry";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { ViewItem } from "@shared/types";

// sidebar

// element is either appContainer (normal sidebar is bound to grid layout) or infoSidebar itself as it's positioned absolute

function setSidebarState(element: HTMLDivElement, collapsed: boolean) {
  const isCollapsed = element.classList.contains("collapsed");
  if (isCollapsed === collapsed) return;
  element.classList.toggle("collapsed", collapsed);
}

//-----------------------------------------------------------

// sidebar empty state

function handleSidebarEmptyState() {
  const sidebar = getAppItem("sidebar");
  const { notes } = noteStore.getState();
  const { searchQuery } = stateStore.getState();
  let shouldShowEmptyState = false;
  if (notes.length === 0) {
    shouldShowEmptyState = true;
  } else if (searchQuery.trim() !== "") {
    const visibleItems = sidebar.querySelectorAll(".note-item:not(.hidden)");
    console.log(visibleItems);
    shouldShowEmptyState = visibleItems.length === 0;
  } else {
    shouldShowEmptyState = false;
  }
  const existingEmptyState = findElement<HTMLDivElement>(
    ".sidebar-empty-state",
    sidebar,
  );
  if (shouldShowEmptyState) {
    if (!existingEmptyState) {
      const template = getTemplateItem("sidebarEmptyStateTemplate");
      const newEmptyState = template.content.firstElementChild?.cloneNode(
        true,
      ) as HTMLDivElement;
      updateSidebarEmptyState(newEmptyState);
      sidebar.appendChild(newEmptyState);
    } else {
      updateSidebarEmptyState(existingEmptyState);
    }
  } else {
    if (existingEmptyState) {
      existingEmptyState.remove();
    }
  }
}

function updateSidebarEmptyState(emptyState: HTMLDivElement) {
  const { searchQuery } = stateStore.getState();
  const isSearch = Boolean(searchQuery?.trim());
  const titleEl = requireElement<HTMLHeadingElement>(
    ".empty-state-title",
    emptyState,
  );
  const descEl = requireElement<HTMLParagraphElement>(
    ".empty-state-description",
    emptyState,
  );
  const iconEl = requireElement<HTMLElement>("#sidebar-empty-icon", emptyState);
  const newIcon = document.createElement("i");
  if (isSearch) {
    newIcon.setAttribute("data-lucide", "search-x");
    titleEl.textContent = "No results found";
    const strongEl = document.createElement("strong");
    strongEl.textContent = `"${searchQuery}"`;
    descEl.replaceChildren("No notes matching ", strongEl);
  } else {
    newIcon.setAttribute("data-lucide", "library");
    titleEl.textContent = "No notes here";
  }
  iconEl.replaceChildren(newIcon);
  renderIcons(emptyState);
}

//----------------------------------------------------------

// create view options

function createViews(views: ViewItem[], activeId?: string | null) {
  const select = requireElement<HTMLSelectElement>(".view-select");
  for (const view of views) {
    const option = document.createElement("option");
    option.textContent = view["label"];
    option.value = view["id"];
    option.disabled = view.id === "links" && !activeId;
    select.append(option);
  }
  return select;
}

//-----------------------------------------------------------

// render note list

function renderNoteList(notes: NoteListItem[]) {
  const sidebar = getAppItem("sidebar");
  const fragment = document.createDocumentFragment();
  for (const note of [...notes].sort(compareNotes)) {
    const element = createNoteItem(note);
    fragment.appendChild(element);
  }
  sidebar.replaceChildren(fragment);
  const { activeId } = stateStore.getState();
  if (!activeId) return;
  const activeElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${activeId}"]`,
    sidebar,
  );
  if (activeElement) {
    setActiveItem(activeElement, sidebar);
  }
}

// create note

function prependNoteToList(note: NoteListItem) {
  const sidebar = getAppItem("sidebar");
  const noteElement = createNoteItem(note);
  sidebar.prepend(noteElement);
}

// delete note

function removeNoteFromList(noteId: string) {
  const sidebar = getAppItem("sidebar");
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${noteId}"]`,
    sidebar,
  );
  if (!noteElement) {
    console.error("[removeNoteFromList]: Note Element not found.");
    return;
  }
  noteElement.remove();
}

// update note

function updateNoteInList(note: NoteListItem) {
  const sidebar = getAppItem("sidebar");
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${note.id}"]`,
    sidebar,
  );
  if (!noteElement) {
    console.error("[updateNoteInList]: Note Element not found.");
    return;
  }
  const wasActive = noteElement.classList.contains("is-active");
  const newElement = createNoteItem(note);
  noteElement.replaceWith(newElement);
  if (wasActive) {
    setActiveItem(newElement, sidebar);
  }
}

export {
  createViews,
  handleSidebarEmptyState,
  prependNoteToList,
  removeNoteFromList,
  renderNoteList,
  setSidebarState,
  updateNoteCount,
  updateNoteInList,
};
