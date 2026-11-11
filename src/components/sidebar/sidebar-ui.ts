import {
  applySnippet,
  createNoteItem,
  sanitizeSnippets,
} from "@/components/sidebar/sidebar-note-items";
import { localStore } from "@/state/state";
import { SIDEBAR_ALL_NOTES_LIMIT, UNTAGGED } from "@/utils/constants";
import { rendererLogger } from "@/utils/helpers";
import { renderIcons } from "@/utils/icons";
import { useCore } from "@/utils/registry";
import type { FilterMode, SelectionParams, SidebarParams } from "@/utils/types";
import {
  createIconButton,
  createInfoSpan,
  createTemplateCloner,
  isDiv,
  requireElement,
  setActiveItem,
} from "@/utils/ui";
import { isNoteID } from "@shared/schemas/note-schema";

function updateSelectionUI(selectionParams: SelectionParams) {
  const { selectionMode, selectedIds } = selectionParams;
  const { sidebar } = useCore("sidebar");
  sidebar.classList.toggle("selection-mode", selectionMode);
  const noteItems = sidebar.querySelectorAll<HTMLDivElement>(".note-item");
  for (const item of noteItems) {
    const id = item.getAttribute("data-id");
    if (!isNoteID(id)) continue;
    const isSelected = selectionMode && !!id && selectedIds.has(id);
    item.classList.toggle("is-selected", isSelected);
  }
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
  const clearBtn = createIconButton("X");
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
        rendererLogger.devLog("[handleHeaderChange]: No active tag found:");
        return;
      }
      return createActiveTagHeader(activeTag);
    case "recent":
      return createInfoHeader("Recent");
    case "search":
      return createInfoHeader("Search");
    default:
      change satisfies never;
      return;
  }
}

const getSidebarEmptyStateClone = createTemplateCloner(
  "sidebarEmptyStateTemplate",
  isDiv,
);

let emptyStateClone: HTMLDivElement | null = null;

function renderSidebarEmptyState(sidebarParams: SidebarParams) {
  const { sidebar } = useCore("sidebar");
  if (!emptyStateClone) {
    emptyStateClone = getSidebarEmptyStateClone();
    renderIcons(emptyStateClone);
  }
  updateSidebarEmptyState(emptyStateClone, sidebarParams.query);
  sidebar.replaceChildren(emptyStateClone);
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
  if (isSearch) {
    titleEl.textContent = "No results found";
    descEl.replaceChildren("No matching notes found");
  } else {
    titleEl.textContent = "No notes here";
  }
}

function toggleSidebar(collapsed?: boolean) {
  const { appContainer } = useCore("appContainer");
  appContainer.classList.toggle("collapsed", collapsed);
}

function handleSidebarChange(sidebarParams: SidebarParams) {
  if (sidebarParams.visibleNotes.length === 0 && !sidebarParams.activeTag) {
    renderSidebarEmptyState(sidebarParams);
    return;
  }
  renderNoteList(sidebarParams);
}

function renderNoteList(sidebarParams: SidebarParams) {
  const { sidebar } = useCore("sidebar");
  const {
    visibleNotes: notes,
    query: searchQuery,
    searchSnippets,
    activeTag,
    activeId,
  } = sidebarParams;
  const fragment = document.createDocumentFragment();
  let activeElement: HTMLDivElement | null = null;
  const currentMode: FilterMode = searchQuery
    ? "search"
    : activeTag
      ? "tag"
      : "recent";
  const headerElement = handleHeaderChange(currentMode, activeTag ?? undefined);
  if (headerElement) {
    fragment.appendChild(headerElement);
  }
  const isFiltered = !!activeTag;
  const isLimited = !isFiltered && notes.length > SIDEBAR_ALL_NOTES_LIMIT;
  const displayNotes = isFiltered
    ? notes
    : notes.slice(0, SIDEBAR_ALL_NOTES_LIMIT);
  for (const note of displayNotes) {
    const item = createNoteItem(note);
    const safe = sanitizeSnippets({ note, snippets: searchSnippets });
    const hasSearchSnippet = !!searchSnippets?.[note.id];
    applySnippet({ item, searchSnippet: safe, isSearch: hasSearchSnippet });
    if (note.id === activeId) {
      activeElement = item;
    }
    fragment.appendChild(item);
  }
  if (isLimited) {
    fragment.appendChild(
      createInfoSpan(
        `Showing ${SIDEBAR_ALL_NOTES_LIMIT} of ${notes.length} notes.\nUse search or tags to narrow the list.`,
        "note-list-info",
      ),
    );
  }
  sidebar.replaceChildren(fragment);
  if (activeElement) {
    setActiveItem(activeElement, sidebar);
  }
}

function resizeSidebar() {
  const storedWidth = localStore.get("sidebarWidth");
  if (
    typeof storedWidth === "number" &&
    Number.isInteger(storedWidth) &&
    storedWidth > 0
  ) {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${storedWidth}px`,
    );
  }
  const minWidth = 0;
  const maxWidth = 420;
  const { sidebarContainer } = useCore("sidebarContainer");
  const resizer = requireElement<HTMLDivElement>(
    ".resizer-sidebar",
    sidebarContainer,
  );

  let isResizing = false;
  let isUpdatePending = false;
  let startX = 0;
  let startWidth = 0;
  let currentWidth = 0;

  resizer.addEventListener("pointerdown", (e: PointerEvent) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebarContainer.getBoundingClientRect().width;
    currentWidth = startWidth;
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
      currentWidth = Math.max(minWidth, Math.min(adjustedWidth, maxWidth));
      document.documentElement.style.setProperty(
        "--sidebar-width",
        `${currentWidth}px`,
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
      localStore.setState({ sidebarWidth: currentWidth });
    }
  });
}

export { handleSidebarChange, resizeSidebar, toggleSidebar, updateSelectionUI };
