import { createNoteItem } from "@/components/sidebar/sidebar-note-items";
import {
  applyTagView,
  applyUntaggedView,
} from "@/components/sidebar/sidebar-views";
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
import type { AllTagsMenu, FilterMode, SidebarParams } from "@shared/types";

let allTagsMenu: AllTagsMenu | null = null;

function createAllTagsPopover(button: HTMLButtonElement): AllTagsMenu {
  const popover = document.createElement("div");
  const content = document.createElement("div");
  let isOpen = false;
  popover.className = "tags-popover";
  content.className = "tags-popover-content";
  const header = createInfoSpan("All Tags", "tags-popover-title");
  const untaggedButton = createIconButton("tag-x", "Untagged");
  untaggedButton.className = "untagged-btn";
  header.appendChild(untaggedButton);
  popover.append(header, content);
  document.body.appendChild(popover);
  renderIcons(popover);

  function positionPopover() {
    const rect = button.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY}px`;
    popover.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
    popover.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
  }

  function open() {
    if (isOpen) return;
    positionPopover();
    popover.classList.remove("hidden");
    isOpen = true;
  }

  function close() {
    if (!isOpen) return;
    popover.classList.add("hidden");
    isOpen = false;
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function render(tags: string[]) {
    const uniqueSortedTags = [...new Set(tags)].sort((a, b) =>
      a.localeCompare(b),
    );
    if (uniqueSortedTags.length === 0) {
      content.replaceChildren(createInfoSpan("No tags here."));
      return;
    }
    const frag = document.createDocumentFragment();
    for (const tag of uniqueSortedTags) {
      const item = document.createElement("span");
      item.className = "tags-popover-item tag";
      item.dataset["tag"] = tag;
      item.title = `#${tag}`;
      item.textContent = `#${tag}`;
      frag.appendChild(item);
    }
    content.replaceChildren(frag);
  }

  popover.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest(".untagged-btn")) {
      applyUntaggedView();
      close();
      return;
    }
    const tagElement = target.closest<HTMLSpanElement>(".tag");
    const tag = tagElement?.dataset["tag"];
    if (tag) {
      applyTagView(tag);
      close();
    }
  });

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (popover.contains(target) || button.contains(target)) return;
    close();
  });

  return {
    popover,
    content,
    render,
    toggle,
    open,
    close,
  };
}

function showAllTagsMenu(button: HTMLButtonElement, tags: string[]) {
  const menu = (allTagsMenu ??= createAllTagsPopover(button));
  menu.render(tags);
  menu.toggle();
}

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

function setSidebarState(element: HTMLDivElement, collapsed: boolean) {
  const isCollapsed = element.classList.contains("collapsed");
  if (isCollapsed === collapsed) return;
  element.classList.toggle("collapsed", collapsed);
}

function toggleSidebar() {
  const appContainer = getAppItem("appContainer");
  const collapsed = appContainer.classList.contains("collapsed");
  setSidebarState(appContainer, !collapsed);
}

function handleSidebarChange(sidebarParams: SidebarParams) {
  if (sidebarParams.visibleNotes.length === 0) {
    renderSidebarEmptyState(sidebarParams);
    return;
  }
  renderNoteList(sidebarParams);
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

function resizeSidebar(resizerSelector: string, sidebarSelector: string) {
  const minWidth = 0;
  const maxWidth = 420;
  const resizer = requireElement<HTMLDivElement>(resizerSelector);
  const sidebar = requireElement<HTMLDivElement>(sidebarSelector);
  let isResizing = false;
  let isUpdatePending = false;
  let startX = 0;
  let startWidth = 0;
  resizer.addEventListener("pointerdown", (e: PointerEvent) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    resizer.setPointerCapture(e.pointerId);
    document.body.classList.add("is-dragging");
    document.body.style.userSelect = "none";
  });

  document.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isResizing || isUpdatePending) return;
    isUpdatePending = true;
    requestAnimationFrame(() => {
      const deltaX = e.clientX - startX;
      const adjustedWidth = startWidth + deltaX;
      const newWidth = Math.max(minWidth, Math.min(adjustedWidth, maxWidth));
      document.documentElement.style.setProperty(
        "--sidebar-width",
        `${newWidth}px`,
      );
      isUpdatePending = false;
    });
  });

  document.addEventListener("pointerup", (e: PointerEvent) => {
    if (isResizing) {
      isResizing = false;
      if (resizer.hasPointerCapture(e.pointerId)) {
        resizer.releasePointerCapture(e.pointerId);
      }
      document.body.classList.remove("is-dragging");
      document.body.style.userSelect = "";
    }
  });
}

export {
  handleSidebarChange,
  renderNoteList,
  resizeSidebar,
  setSidebarState,
  showAllTagsMenu,
  toggleSidebar,
  updateNoteCount,
};
