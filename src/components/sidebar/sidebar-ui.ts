import { getAll } from "@/api/api";
import { createNoteItem } from "@/components/sidebar/sidebar-note-items";
import { noteStore, searchEngine, stateStore } from "@/settings/app-state";
import { findElement, requireElement, setActiveItem } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem, getInfobarItems, getTemplateItem } from "@/utils/registry";
import { getTodoStats } from "@shared/generators";
import type { Note } from "@shared/schemas/note-schema";
import type { ViewItem } from "@shared/types";
import type { JSONContent } from "@tiptap/core";

// sidebar

// element is either appContainer (normal sidebar is bound to grid layout) or infoSidebar itself as it's positioned absolute

function setSidebarState(element: HTMLDivElement, collapsed: boolean) {
  const isCollapsed = element.classList.contains("collapsed");
  if (isCollapsed === collapsed) return;
  element.classList.toggle("collapsed", collapsed);
}

//-----------------------------------------------------------

// sidebar empty state (only applies to normal sidebar. info-sidebar does not have one)

function handleSidebarEmptyState() {
  const sidebar = getAppItem("sidebar");
  const { notes } = noteStore.getState();
  const { searchQuery } = stateStore.getState();
  let shouldShowEmptyState = false;
  if (searchQuery.trim() !== "") {
    const results = searchEngine.search(searchQuery);
    shouldShowEmptyState = results.length === 0;
  } else {
    shouldShowEmptyState = notes.length === 0;
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
    descEl.textContent = "Create a note to get started.";
  }
  iconEl.replaceChildren(newIcon);
  renderIcons(emptyState);
}

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

//-----------------------------------------------------------

// sidebar population with note items

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
    setActiveItem(noteElement, sidebar);
  });
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
    const { activeId } = stateStore.getState();
    if (!activeId) return;
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${activeId}"]`,
      sidebar,
    );
    if (noteElement) setActiveItem(noteElement, sidebar);
  });
}

// notes? for views if they yield results
async function reloadNoteList(notes?: Note[]) {
  const sidebar = getAppItem("sidebar");
  sidebar.replaceChildren();
  if (notes) {
    const sortedNotes = notes.sort(compareNotes);
    noteStore.setState({ notes: sortedNotes });
    addManyNotesToList(sortedNotes);
    return;
  }
  const result = await getAll();
  if (!result.success) {
    console.error("[getAll]: Failed to fetch all notes:", result.error);
    return;
  } else {
    const sortedNotes = result.data.sort(compareNotes);
    noteStore.setState({ notes: sortedNotes });
    addManyNotesToList(sortedNotes);
  }
}

// updates one note
function updateNoteInList(note: Note) {
  const sidebar = getAppItem("sidebar");
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${note.id}"]`,
    sidebar,
  );
  if (!noteElement) {
    console.warn("Note Element not found.");
    return;
  }
  const wasActive = noteElement.classList.contains("is-active");
  const newElement = createNoteItem(note);
  if (wasActive) {
    setActiveItem(newElement, sidebar);
  }
  noteElement.replaceWith(newElement);
}

//------------------------------------------------------------

// info-sidebar

function showTodoProgress(content: JSONContent) {
  const stats = getTodoStats(content);
  const { todoContainer, todoCount, todoProgress } = getInfobarItems([
    "todoContainer",
    "todoCount",
    "todoProgress",
  ]);
  if (stats.total === 0) {
    if (todoContainer.style.display !== "none")
      todoContainer.style.display = "none";
    return;
  }
  if (todoContainer.style.display !== "block")
    todoContainer.style.display = "block";

  todoCount.textContent = `${stats.completed}/${stats.total}`;
  const percentage = (stats.completed / stats.total) * 100;
  todoProgress.style.width = `${percentage}%`;
  todoProgress.style.backgroundColor =
    percentage === 100 ? "var(--tag-color)" : "var(--text-muted)";
}

export {
  addManyNotesToList,
  addOneNoteToList,
  createViews,
  handleSidebarEmptyState,
  reloadNoteList,
  setSidebarState,
  showTodoProgress,
  updateNoteCount,
  updateNoteInList,
};
