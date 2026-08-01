import { createNoteItem } from "@/components/sidebar/sidebar-note-items";
import { stateStore } from "@/state/state";
import {
  createIconButton,
  createInfoSpan,
  createTemplateCloner,
  isDiv,
  requireElement,
  setActiveItem,
} from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { compareNotes, updateNoteCount } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import { SIDEBAR_ALL_NOTES_LIMIT, UNTAGGED } from "@shared/constants";
import type { FilterMode, SidebarParams } from "@shared/types";

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

function createInfoHeader(text: string) {
  const header = document.createElement("div");
  header.className = "sidebar-info-header";
  const label = document.createElement("span");
  label.textContent = text;
  header.appendChild(label);
  return header;
}

function handleHeaderChange(change: FilterMode, activeTag?: string) {
  if (!change) return;
  switch (change) {
    case "tag":
      if (!activeTag) {
        console.warn("[handleHeaderChange]: No active tag found:");
        return;
      }
      return createActiveTagHeader(activeTag);
    case "recent":
      return createInfoHeader("Recent");
    case "search":
      return createInfoHeader("Search");
  }
}

const getSidebarEmptyStateClone = createTemplateCloner(
  "sidebarEmptyStateTemplate",
  isDiv,
);

function setSidebarState(element: HTMLDivElement, collapsed: boolean) {
  const isCollapsed = element.classList.contains("collapsed");
  if (isCollapsed === collapsed) return;
  element.classList.toggle("collapsed", collapsed);
}

function renderSidebarEmptyState(sidebarParams: SidebarParams) {
  const sidebar = getAppItem("sidebar");
  const emptyState = getSidebarEmptyStateClone();
  updateSidebarEmptyState(emptyState, sidebarParams.query);
  sidebar.replaceChildren(emptyState);
}

function updateSidebarEmptyState(emptyState: HTMLDivElement, query: string) {
  const isSearch = !!query;
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
    strongEl.textContent = `"${query}"`;
    descEl.replaceChildren("No notes matching ", strongEl);
  } else {
    newIcon.setAttribute("data-lucide", "library");
    titleEl.textContent = "No notes here";
  }
  iconEl.replaceChildren(newIcon);
  renderIcons(emptyState);
}

function handleSidebarChange(sidebarParams: SidebarParams) {
  const safeQuery =
    typeof sidebarParams.query === "string" ? sidebarParams.query.trim() : "";
  const nextParams = { ...sidebarParams, query: safeQuery };
  if (sidebarParams.visibleNotes.length === 0) {
    renderSidebarEmptyState(nextParams);
    return;
  }
  renderNoteList(nextParams);
}

function renderNoteList(sidebarParams: SidebarParams) {
  const sidebar = getAppItem("sidebar");
  const activeId = stateStore.get("activeId");
  const { visibleNotes: notes, query: searchQuery, activeTag } = sidebarParams;
  const fragment = document.createDocumentFragment();
  let activeElement: HTMLDivElement | null = null;
  let currentMode: FilterMode = "recent";
  if (searchQuery) {
    currentMode = "search";
  } else if (activeTag) {
    currentMode = "tag";
  }
  const headerElement = handleHeaderChange(currentMode, activeTag ?? undefined);
  if (headerElement) {
    fragment.appendChild(headerElement);
  }
  const sortedNotes = [...notes].sort(compareNotes);
  const isFiltered = !!activeTag;
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

export {
  handleSidebarChange,
  renderNoteList,
  setSidebarState,
  updateNoteCount,
};
