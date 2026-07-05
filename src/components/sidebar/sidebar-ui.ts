import { createIconButton } from "@/components/sidebar/sidebar-features";
import { createNoteItem } from "@/components/sidebar/sidebar-note-items";
import { noteStore, stateStore } from "@/settings/app-state";
import {
  createInfoSpan,
  findElement,
  requireElement,
  setActiveItem,
} from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem, getTemplateItem } from "@/utils/registry";
import { SIDEBAR_ALL_NOTES_LIMIT, UNTAGGED } from "@shared/constants";
import type { NoteListItem } from "@shared/schemas/note-schema";

// sidebar

// element is appContainer (sidebar is bound to grid layout)

function setSidebarState(element: HTMLDivElement, collapsed: boolean) {
  const isCollapsed = element.classList.contains("collapsed");
  if (isCollapsed === collapsed) return;
  element.classList.toggle("collapsed", collapsed);
}

//-----------------------------------------------------------

// sidebar empty state

function handleSidebarEmptyState() {
  const sidebar = getAppItem("sidebar");
  const visibleIds = noteStore.get("visibleIds");
  let shouldShowEmptyState = false;
  if (visibleIds.length === 0) shouldShowEmptyState = true;
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
  const searchQuery = stateStore.get("searchQuery");
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

// note list

function getTagDisplayLabel(tag: string): string {
  if (tag === UNTAGGED) return "Untagged";
  return `#${tag}`;
}

function createActiveTagHeader(tag: string): HTMLDivElement {
  const header = document.createElement("div");
  header.className = "active-tag-header";
  const label = document.createElement("span");
  label.textContent = getTagDisplayLabel(tag);
  const clearBtn = createIconButton("x");
  clearBtn.className = "active-tag-clear-btn";
  clearBtn.setAttribute("data-action", "clear-active-tag");
  header.append(label, clearBtn);
  renderIcons(clearBtn);
  return header;
}

function renderNoteList(notes: NoteListItem[]) {
  const sidebar = getAppItem("sidebar");
  const { activeId, activeTag } = stateStore.getState();
  const fragment = document.createDocumentFragment();
  let activeElement: HTMLDivElement | null = null;
  if (activeTag) {
    fragment.appendChild(createActiveTagHeader(activeTag));
  }
  const sortedNotes = [...notes].sort(compareNotes);
  const isFiltered = Boolean(activeTag);
  const isLimited = !isFiltered && sortedNotes.length > SIDEBAR_ALL_NOTES_LIMIT;
  const displayNotes = isFiltered
    ? sortedNotes
    : sortedNotes.slice(0, SIDEBAR_ALL_NOTES_LIMIT);
  for (const note of displayNotes) {
    const element = createNoteItem(note);
    if (note.id === activeId) {
      activeElement = element;
    }
    fragment.appendChild(element);
  }
  if (isLimited) {
    fragment.appendChild(
      createInfoSpan(
        `Showing ${SIDEBAR_ALL_NOTES_LIMIT} of ${sortedNotes.length} notes.\nUse search or tags to narrow the list.`,
        "note-list-info",
      ),
    );
  }
  sidebar.replaceChildren(fragment);
  if (activeElement) {
    setActiveItem(activeElement, sidebar);
  }
}

// create note

function addNoteToList(note: NoteListItem) {
  const sidebar = getAppItem("sidebar");
  const noteElement = createNoteItem(note);
  const activeHeader = findElement<HTMLDivElement>(".active-tag-header");
  if (activeHeader) {
    activeHeader.after(noteElement);
  } else {
    sidebar.prepend(noteElement);
  }
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
  addNoteToList,
  handleSidebarEmptyState,
  removeNoteFromList,
  renderNoteList,
  setSidebarState,
  updateNoteCount,
  updateNoteInList,
};
